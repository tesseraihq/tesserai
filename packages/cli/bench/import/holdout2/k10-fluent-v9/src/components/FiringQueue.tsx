import {
  Badge,
  Button,
  Card,
  CardHeader,
  Divider,
  Text,
  Title2,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { AddRegular } from "@fluentui/react-icons";

const useStyles = makeStyles({
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: tokens.spacingVerticalL },
  list: { display: "grid", gap: tokens.spacingVerticalM },
  meta: { color: tokens.colorNeutralForeground3 },
  temp: { fontFamily: tokens.fontFamilyMonospace },
});

const firings = [
  { kiln: "Kiln A", program: "Cone 6 glaze", temp: 1222, status: "running" as const },
  { kiln: "Kiln B", program: "Bisque 04", temp: 1060, status: "queued" as const },
  { kiln: "Kiln C", program: "Cone 10 reduction", temp: 0, status: "fault" as const },
];

const badge = { running: "success", queued: "informative", fault: "danger" } as const;

export function FiringQueue() {
  const styles = useStyles();
  return (
    <section>
      <div className={styles.header}>
        <Title2>Firing queue</Title2>
        <Button appearance="primary" icon={<AddRegular />}>
          Schedule firing
        </Button>
      </div>
      <div className={styles.list}>
        {firings.map((f) => (
          <Card key={f.kiln}>
            <CardHeader
              header={<Text weight="semibold">{f.kiln} · {f.program}</Text>}
              description={<Text className={styles.meta}>Target <span className={styles.temp}>{f.temp}°C</span></Text>}
              action={<Badge appearance="tint" color={badge[f.status]}>{f.status}</Badge>}
            />
            <Divider />
          </Card>
        ))}
      </div>
    </section>
  );
}
