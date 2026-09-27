export function Card(props: any) {
  return <div data-slot="card" {...props} />;
}
export const CardHeader = Card, CardTitle = Card, CardContent = Card;
