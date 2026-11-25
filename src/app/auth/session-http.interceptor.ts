import { prepareSync, finishSync, publishLocalMutation } from './sync-cache';
import { inject, Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { catchError, defer, from, switchMap, throwError, map } from 'rxjs';
import { AuthService } from './auth.service';
import { TokenInterceptorService } from './token-interceptor.service';
import { API_URLS } from '../config/api-urls';

const API_ORIGINS = new Set(
  Object.values(API_URLS)
    .filter((url) => url.startsWith('https://'))
    .map((url) => new URL(url).origin),
);
@Injectable()
export class SessionHttpInterceptor implements HttpInterceptor {
  private readonly auth = inject(AuthService);
  private readonly tokens = inject(TokenInterceptorService);

  intercept(request: HttpRequest<unknown>, next: HttpHandler) {
    // Never attach session credentials to public APIs or signed Storage upload URLs.
    const origin = new URL(request.url, window.location.origin).origin;
    if (!request.headers.has('Authorization') || !API_ORIGINS.has(origin))
      return next.handle(request);
    const cached = prepareSync(request.url, request.body);
    const send = (token: string) =>
      next
        .handle(
          request.clone({ body: cached.body, setHeaders: { Authorization: `Bearer ${token}` } }),
        )
        .pipe(
          map((event) =>
            event instanceof HttpResponse
              ? (publishLocalMutation(request.url, event.body, request.body),
                event.clone({ body: finishSync(cached, event.body) }))
              : event,
          ),
        );
    return defer(() =>
      from(
        this.auth.getSession()?.sessionToken
          ? Promise.resolve(this.auth.getSession()!.sessionToken)
          : this.tokens.renew(),
      ),
    ).pipe(
      switchMap((token) =>
        send(token).pipe(
          catchError((error) => {
            if (!(error instanceof HttpErrorResponse) || error.status !== 401)
              return throwError(() => error);
            return from(this.tokens.renewAfterUnauthorized(token)).pipe(
              switchMap(send),
              catchError((retryError) => {
                if (retryError instanceof HttpErrorResponse && retryError.status === 401)
                  this.tokens.expireSession();
                return throwError(() => retryError);
              }),
            );
          }),
        ),
      ),
    );
  }
}
