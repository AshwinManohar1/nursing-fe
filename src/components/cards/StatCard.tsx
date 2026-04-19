import { Card, CardContent, Typography } from "@mui/material";

interface StatCardProps {
  title: string;
  value: number;
}

const StatCard = ({ title, value }: StatCardProps) => (
  <Card>
    <CardContent>
      <Typography variant="h4" component="div">
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {title}
      </Typography>
    </CardContent>
  </Card>
);

export default StatCard;
