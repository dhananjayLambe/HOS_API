"use client"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// TypeScript interfaces for our data
interface RatingDistribution {
  rating: number
  count: number
  percentage: number
}

interface ResponseTrend {
  date: string
  responses: number
  completionRate: number
}

interface DepartmentFeedback {
  name: string
  value: number
  percentage: number
}

interface SentimentAnalysis {
  month: string
  positive: number
  neutral: number
  negative: number
}

// Sample data
const ratingDistributionData: RatingDistribution[] = [
  { rating: 1, count: 12, percentage: 3 },
  { rating: 2, count: 27, percentage: 7 },
  { rating: 3, count: 84, percentage: 21 },
  { rating: 4, count: 156, percentage: 39 },
  { rating: 5, count: 121, percentage: 30 },
]

const responseTrendData: ResponseTrend[] = [
  { date: "Jan", responses: 45, completionRate: 68 },
  { date: "Feb", responses: 52, completionRate: 72 },
  { date: "Mar", responses: 61, completionRate: 75 },
  { date: "Apr", responses: 58, completionRate: 70 },
  { date: "May", responses: 65, completionRate: 73 },
  { date: "Jun", responses: 74, completionRate: 78 },
  { date: "Jul", responses: 79, completionRate: 82 },
  { date: "Aug", responses: 82, completionRate: 80 },
  { date: "Sep", responses: 76, completionRate: 76 },
  { date: "Oct", responses: 85, completionRate: 84 },
  { date: "Nov", responses: 90, completionRate: 85 },
  { date: "Dec", responses: 94, completionRate: 88 },
]

const departmentFeedbackData: DepartmentFeedback[] = [
  { name: "General Medicine", value: 35, percentage: 35 },
  { name: "Emergency", value: 20, percentage: 20 },
  { name: "Pediatrics", value: 15, percentage: 15 },
  { name: "Cardiology", value: 12, percentage: 12 },
  { name: "Orthopedics", value: 10, percentage: 10 },
  { name: "Other", value: 8, percentage: 8 },
]

const sentimentAnalysisData: SentimentAnalysis[] = [
  { month: "Jan", positive: 65, neutral: 25, negative: 10 },
  { month: "Feb", positive: 60, neutral: 30, negative: 10 },
  { month: "Mar", positive: 70, neutral: 20, negative: 10 },
  { month: "Apr", positive: 68, neutral: 22, negative: 10 },
  { month: "May", positive: 72, neutral: 18, negative: 10 },
  { month: "Jun", positive: 75, neutral: 15, negative: 10 },
]

// Colors for charts
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82ca9d"]
const SENTIMENT_COLORS = {
  positive: "#4ade80",
  neutral: "#94a3b8",
  negative: "#f87171",
}

export function RatingDistributionChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rating Distribution</CardTitle>
        <CardDescription>Distribution of ratings across all surveys</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={ratingDistributionData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="rating" />
            <YAxis />
            <Tooltip
              formatter={(value, name) => {
                if (name === "count") return [`${value} responses`, "Count"]
                return [`${value}%`, "Percentage"]
              }}
            />
            <Legend />
            <Bar dataKey="count" fill="#8884d8" name="Count" />
            <Bar dataKey="percentage" fill="#82ca9d" name="Percentage (%)" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function ResponseTrendChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Response Trends</CardTitle>
        <CardDescription>Survey response trends over time</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={responseTrendData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="responses"
              stroke="#8884d8"
              activeDot={{ r: 8 }}
              name="Responses"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="completionRate"
              stroke="#82ca9d"
              name="Completion Rate (%)"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function DepartmentFeedbackChart() {
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: {
    cx: number
    cy: number
    midAngle: number
    innerRadius: number
    outerRadius: number
    percent: number
  }) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feedback Distribution by Department</CardTitle>
        <CardDescription>Percentage of feedback received from each department</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={departmentFeedbackData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
            >
              {departmentFeedbackData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${value} responses`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function SentimentAnalysisChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sentiment Analysis</CardTitle>
        <CardDescription>Feedback sentiment trends over time</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={sentimentAnalysisData}
            margin={{
              top: 10,
              right: 30,
              left: 0,
              bottom: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => `${value}%`} />
            <Legend />
            <Area
              type="monotone"
              dataKey="positive"
              stackId="1"
              stroke={SENTIMENT_COLORS.positive}
              fill={SENTIMENT_COLORS.positive}
              name="Positive"
            />
            <Area
              type="monotone"
              dataKey="neutral"
              stackId="1"
              stroke={SENTIMENT_COLORS.neutral}
              fill={SENTIMENT_COLORS.neutral}
              name="Neutral"
            />
            <Area
              type="monotone"
              dataKey="negative"
              stackId="1"
              stroke={SENTIMENT_COLORS.negative}
              fill={SENTIMENT_COLORS.negative}
              name="Negative"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
