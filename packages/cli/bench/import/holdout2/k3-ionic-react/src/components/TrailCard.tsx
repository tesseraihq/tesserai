import { IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle } from "@ionic/react";

type Props = { name: string; miles: number; status: "open" | "caution" | "closed" };

const statusColor = { open: "success", caution: "warning", closed: "danger" } as const;

export default function TrailCard({ name, miles, status }: Props) {
  return (
    <IonCard className="trail-card">
      <IonCardHeader>
        <IonCardTitle>{name}</IonCardTitle>
        <p className="trail-meta">{miles} mi round trip</p>
      </IonCardHeader>
      <IonCardContent>
        <IonBadge color={statusColor[status]}>{status}</IonBadge>
        <IonButton expand="block" color="primary" disabled={status === "closed"}>
          Start hike
        </IonButton>
      </IonCardContent>
    </IonCard>
  );
}
