import { useMemo } from "react";
import { trpc } from "../lib/trpc";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";
import { Download, TrendingUp, Clock, CheckCircle, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { AnalyticsSkeleton } from "@/components/AnalyticsSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { useLocation } from "wouter";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function AnalyticsDashboard() {
  const { data: stats, isLoading } = trpc.transcriptions.stats.useQuery();

  // Export to CSV
  const exportToCSV = () => {
    if (!stats) return;

    const headers = ["Métrique", "Valeur"];
    const rows = [
      ["Total de transcriptions", stats.total.toString()],
      ["Durée totale (heures)", (stats.totalDuration / 3600).toFixed(2)],
      ["Temps moyen (minutes)", (stats.avgDuration / 60).toFixed(2)],
      ["Taux de succès (%)", stats.successRate.toFixed(1)],
      [""],
      ["Transcriptions par jour"],
      ...stats.transcriptionsByDay.map((d: { date: string; count: number }) => [d.date, d.count.toString()]),
      [""],
      ["Répartition par statut"],
      ...stats.transcriptionsByStatus.map((s: { status: string; count: number }) => [s.status, s.count.toString()]),
    ];

    const csvContent =
      headers.join(",") +
      "\n" +
      rows.map((row) => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `transcribe-express-stats-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  // Chart data
  const lineChartData = useMemo(() => {
    if (!stats) return null;

    return {
      labels: stats.transcriptionsByDay.map((d: { date: string; count: number }) => d.date),
      datasets: [
        {
          label: "Transcriptions",
          data: stats.transcriptionsByDay.map((d: { date: string; count: number }) => d.count),
          borderColor: "#E935C1",
          backgroundColor: "rgba(233, 53, 193, 0.1)",
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }, [stats]);

  const doughnutChartData = useMemo(() => {
    if (!stats) return null;

    const colors = {
      completed: "#10B981",
      processing: "#06B6D4",
      pending: "#F59E0B",
      error: "#EF4444",
    };

    return {
      labels: stats.transcriptionsByStatus.map((s: { status: string; count: number }) => s.status),
      datasets: [
        {
          data: stats.transcriptionsByStatus.map((s: { status: string; count: number }) => s.count),
          backgroundColor: stats.transcriptionsByStatus.map(
            (s: { status: string; count: number }) => colors[s.status as keyof typeof colors] || "#6B7280"
          ),
          borderWidth: 0,
        },
      ],
    };
  }, [stats]);

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  const [, setLocation] = useLocation();

  if (!stats || stats.total === 0) {
    return (
      <div className="container py-8">
        <EmptyState
          icon={BarChart3}
          title="Aucune donnée disponible"
          description="Vous n'avez pas encore de transcriptions. Commencez par uploader un fichier pour voir vos statistiques apparaître ici."
          actionLabel="Commencer"
          onAction={() => setLocation("/upload")}
        />
      </div>
    );
  }

  return (
    <motion.div 
      className="container py-8 space-y-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <motion.div 
        className="flex items-center justify-between"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#E935C1] to-[#06B6D4] bg-clip-text text-transparent">
            Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Statistiques et insights sur vos transcriptions
          </p>
        </div>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exporter CSV
        </Button>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 border-border/50 bg-card/50 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-3xl font-bold mt-2">{stats.total}</p>
            </div>
            <div className="p-3 rounded-full bg-[#E935C1]/10">
              <BarChart3 className="w-6 h-6 text-[#E935C1]" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-border/50 bg-card/50 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Durée totale</p>
              <p className="text-3xl font-bold mt-2">
                {(stats.totalDuration / 3600).toFixed(1)}h
              </p>
            </div>
            <div className="p-3 rounded-full bg-[#06B6D4]/10">
              <Clock className="w-6 h-6 text-[#06B6D4]" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-border/50 bg-card/50 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Temps moyen</p>
              <p className="text-3xl font-bold mt-2">
                {(stats.avgDuration / 60).toFixed(1)}min
              </p>
            </div>
            <div className="p-3 rounded-full bg-[#10B981]/10">
              <TrendingUp className="w-6 h-6 text-[#10B981]" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-border/50 bg-card/50 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Taux de succès</p>
              <p className="text-3xl font-bold mt-2">{stats.successRate.toFixed(1)}%</p>
            </div>
            <div className="p-3 rounded-full bg-[#10B981]/10">
              <CheckCircle className="w-6 h-6 text-[#10B981]" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart */}
        <Card className="p-6 border-border/50 bg-card/50 backdrop-blur">
          <h2 className="text-xl font-semibold mb-4">Transcriptions par jour</h2>
          <p className="text-sm text-muted-foreground mb-6">
            7 derniers jours
          </p>
          {lineChartData && (
            <Line
              data={lineChartData}
              options={{
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      precision: 0,
                    },
                  },
                },
              }}
            />
          )}
        </Card>

        {/* Doughnut Chart */}
        <Card className="p-6 border-border/50 bg-card/50 backdrop-blur">
          <h2 className="text-xl font-semibold mb-4">Répartition par statut</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Distribution des transcriptions
          </p>
          {doughnutChartData && (
            <div className="flex items-center justify-center">
              <div className="w-64 h-64">
                <Doughnut
                  data={doughnutChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                      legend: {
                        position: "bottom",
                      },
                    },
                  }}
                />
              </div>
            </div>
          )}
        </Card>
      </div>
    </motion.div>
  );
}
