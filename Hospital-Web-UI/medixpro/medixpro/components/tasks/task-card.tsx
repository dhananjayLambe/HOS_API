"use client"

import { useRef } from "react"
import { useDrag, useDrop } from "react-dnd"
import { format } from "date-fns"
import { CheckCircle2, Circle, Clock, Calendar, Edit, Trash2, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"

// Task type definition
interface Task {
  id: string
  title: string
  description: string
  status: "todo" | "in-progress" | "completed"
  priority: "low" | "medium" | "high"
  dueDate: Date | null
  createdAt: Date
  assignedTo?: string
}

interface TaskCardProps {
  task: Task
  index: number
  moveTask: (dragIndex: number, hoverIndex: number) => void
  toggleCompletion: (taskId: string) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  isUpdating?: boolean
}

// DND item types
const ItemTypes = {
  TASK: "task",
}

export function TaskCard({ task, index, moveTask, toggleCompletion, onEdit, onDelete, isUpdating = false }: TaskCardProps) {
  const ref = useRef<HTMLDivElement>(null)

  // Get priority badge with enhanced colors
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return (
          <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 shadow-sm">
            High
          </Badge>
        )
      case "medium":
        return (
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-sm">
            Medium
          </Badge>
        )
      case "low":
        return (
          <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 shadow-sm">
            Low
          </Badge>
        )
      default:
        return null
    }
  }

  // Get status icon with enhanced colors
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
      case "in-progress":
        return <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      case "todo":
        return <Circle className="h-4 w-4 text-gray-500 dark:text-gray-400" />
      default:
        return null
    }
  }

  // Get status background gradient
  const getStatusBackground = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800"
      case "in-progress":
        return "bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200 dark:border-amber-800"
      case "todo":
        return "bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-gray-900/50 border-slate-200 dark:border-slate-700"
      default:
        return "bg-card border"
    }
  }

  // Set up drag
  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: ItemTypes.TASK,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  // Set up drop
  const [, drop] = useDrop({
    accept: ItemTypes.TASK,
    hover(item: { index: number }, monitor) {
      if (!ref.current) {
        return
      }

      const dragIndex = item.index
      const hoverIndex = index

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return
      }

      // Time to actually perform the action
      moveTask(dragIndex, hoverIndex)

      // Note: we're mutating the monitor item here!
      item.index = hoverIndex
    },
  })

  // Initialize drag and drop refs
  drag(drop(ref))

  return (
    <Card
      ref={dragPreview as any}
      className={`border-2 shadow-md hover:shadow-xl transition-all duration-200 ${getStatusBackground(task.status)} ${isDragging ? "opacity-50 scale-95" : "opacity-100"} ${task.status === "completed" ? "opacity-90" : ""}`}
    >
      <CardHeader className="p-5 pb-3 flex flex-row items-start justify-between space-y-0 border-b border-opacity-20">
        <div className="flex items-start gap-2 flex-1">
          <div ref={ref} className="cursor-move mt-1 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-base mb-2 ${task.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {task.title}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              {getPriorityBadge(task.priority)}
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                task.status === "completed" 
                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" 
                  : task.status === "in-progress"
                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              }`}>
                {getStatusIcon(task.status)}
                <span className="capitalize">{task.status.replace("-", " ")}</span>
              </div>
            </div>
          </div>
        </div>
        <Checkbox 
          checked={task.status === "completed"} 
          onCheckedChange={() => toggleCompletion(task.id)} 
          disabled={isUpdating}
          className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
        />
      </CardHeader>
      <CardContent className="p-5 pt-4">
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">{task.description}</p>

        <div className="flex flex-col gap-2">
          {task.dueDate && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium w-fit">
              <Calendar className="h-3.5 w-3.5" />
              <span>Due: {format(task.dueDate, "MMM d, yyyy")}</span>
            </div>
          )}

          {task.assignedTo && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-medium w-fit">
              <span>👤 {task.assignedTo}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="!p-3 flex justify-end border-t border-opacity-20">
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onEdit(task)}
            disabled={isUpdating}
            className="hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onDelete(task)}
            disabled={isUpdating}
            className="hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300 transition-colors"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
