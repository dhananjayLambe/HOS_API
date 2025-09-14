"use client"

import { useState, useEffect } from "react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts"

const data = [
  {
    name: "Jan",
    total: Math.floor(Math.random() * 5000) + 1000,
    patients: Math.floor(Math.random() * 100) + 50,
  },
  {
    name: "Feb",
    total: Math.floor(Math.random() * 5000) + 1000,
    patients: Math.floor(Math.random() * 100) + 50,
  },
  {
    name: "Mar",
    total: Math.floor(Math.random() * 5000) + 1000,
    patients: Math.floor(Math.random() * 100) + 50,
  },
  {
    name: "Apr",
    total: Math.floor(Math.random() * 5000) + 1000,
    patients: Math.floor(Math.random() * 100) + 50,
  },
  {
    name: "May",
    total: Math.floor(Math.random() * 5000) + 1000,
    patients: Math.floor(Math.random() * 100) + 50,
  },
  {
    name: "Jun",
    total: Math.floor(Math.random() * 5000) + 1000,
    patients: Math.floor(Math.random() * 100) + 50,
  },
  {
    name: "Jul",
    total: Math.floor(Math.random() * 5000) + 1000,
    patients: Math.floor(Math.random() * 100) + 50,
  },
  {
    name: "Aug",
    total: Math.floor(Math.random() * 5000) + 1000,
    patients: Math.floor(Math.random() * 100) + 50,
  },
  {
    name: "Sep",
    total: Math.floor(Math.random() * 5000) + 1000,
    patients: Math.floor(Math.random() * 100) + 50,
  },
  {
    name: "Oct",
    total: Math.floor(Math.random() * 5000) + 1000,
    patients: Math.floor(Math.random() * 100) + 50,
  },
  {
    name: "Nov",
    total: Math.floor(Math.random() * 5000) + 1000,
    patients: Math.floor(Math.random() * 100) + 50,
  },
  {
    name: "Dec",
    total: Math.floor(Math.random() * 5000) + 1000,
    patients: Math.floor(Math.random() * 100) + 50,
  },
]

export function Overview() {
  const [chartHeight, setChartHeight] = useState(350)
  const [chartWidth, setChartWidth] = useState('100%')

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      if (width < 640) {
        setChartHeight(200)
        setChartWidth(width - 40 as unknown as string)
      } else if (width < 1024) {
        setChartHeight(300)
        setChartWidth('100%')
      } else {
        setChartHeight(350)
        setChartWidth('100%')
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (   
      <ResponsiveContainer width={chartWidth} height={chartHeight}>
        <BarChart data={data}>
          <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
          {/* <Tooltip /> */}
          <Legend />
          <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} className="fill-blue-600" />
          <Bar dataKey="patients" fill="#4ade80" radius={[4, 4, 0, 0]} className="fill-green-600" />
        </BarChart>
      </ResponsiveContainer>    
  )
}
