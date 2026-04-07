import { Routes } from '@angular/router';
import { App } from './app'; // Tu componente de Login
import { HomeComponent } from './home/home.component'; //
import { StudentsComponent, } from './alumnas/alumnas.component'; //
import { StudentDetailComponent } from './alumnas/detalle_alumna.component';
import {StaffComponent} from './staff/maestras.component';
import {PlansComponent} from './planes/planes.component';
import {PagosComponent} from './pagos/pagos.component';
import {SucursalComponent} from './miEstudio/studio.component'


export const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'students', component: StudentsComponent },
  { path: 'students/:id', component: StudentDetailComponent },
  { path: 'staff', component: StaffComponent },
  { path: 'planes', component: PlansComponent },
  {path:'pagos',component:PagosComponent},
   {path:'sucursales',component:SucursalComponent},

  // Ruta inicial: redirige a home si el path está vacío
  { path: '', redirectTo: 'home', pathMatch: 'full' },

  // RUTA COMODÍN: Siempre al final
  { path: '**', redirectTo: 'home' }
];
