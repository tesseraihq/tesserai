import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { MatToolbarModule } from "@angular/material/toolbar";

@Component({
  selector: "gl-root",
  standalone: true,
  imports: [RouterOutlet, MatToolbarModule],
  template: `
    <mat-toolbar>Greenline</mat-toolbar>
    <router-outlet />
  `,
})
export class AppComponent {}
