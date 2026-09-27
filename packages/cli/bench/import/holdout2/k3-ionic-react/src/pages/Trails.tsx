import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from "@ionic/react";
import TrailCard from "../components/TrailCard";
import "./Trails.css";

const trails = [
  { name: "Eagle Creek", miles: 12.4, status: "open" as const },
  { name: "Dog Mountain", miles: 6.9, status: "caution" as const },
  { name: "Angel's Rest", miles: 4.8, status: "closed" as const },
];

export default function TrailsPage() {
  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle>Nearby trails</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {trails.map((t) => (
          <TrailCard key={t.name} {...t} />
        ))}
      </IonContent>
    </IonPage>
  );
}
