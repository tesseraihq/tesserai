import { Component, input } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatDividerModule } from "@angular/material/divider";
import { MatIconModule } from "@angular/material/icon";

type Shipment = { id: string; destination: string; eta: string; delayed: boolean };

@Component({
  selector: "gl-shipment-list",
  standalone: true,
  imports: [MatButtonModule, MatCardModule, MatDividerModule, MatIconModule],
  templateUrl: "./shipment-list.component.html",
  styleUrl: "./shipment-list.component.scss",
})
export class ShipmentListComponent {
  shipments = input<Shipment[]>([
    { id: "GL-20931", destination: "Rotterdam", eta: "Oct 2", delayed: false },
    { id: "GL-20944", destination: "Antwerp", eta: "Oct 4", delayed: true },
  ]);
}
