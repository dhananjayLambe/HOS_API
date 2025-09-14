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
}

// DND item types
const ItemTypes = {
  TASK: "task",
}

export function TaskCard({ task, index, moveTask, toggleCompletion, onEdit, onDelete }: TaskCardProps) {
  const ref = useRef<HTMLDivElement>(null)

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">High</Badge>
      case "medium":
        return (
          <Badge variant="default" className="bg-amber-500">
            Medium
          </Badge>
        )
      case "low":
        return <Badge variant="outline">Low</Badge>
      default:
        return null
    }
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "in-progress":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "todo":
        return <Circle className="h-4 w-4 text-gray-400" />
      default:
        return null
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
      className={`${task.status === "completed" ? "bg-muted/50" : ""} ${isDragging ? "opacity-50" : "opacity-100"}`}
    >
      <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
        <div className="flex items-start gap-2">
          <div ref={ref} className="cursor-move mt-1">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className={`font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
              {task.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {getPriorityBadge(task.priority)}
              <div className="flex items-center text-xs text-muted-foreground">
                {getStatusIcon(task.status)}
                <span className="ml-1 capitalize">{task.status.replace("-", " ")}</span>
              </div>
            </div>
          </div>
        </div>
        <Checkbox checked={task.status === "completed"} onCheckedChange={() => toggleCompletion(task.id)} />
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-sm text-muted-foreground">{task.description}</p>

        <div className="flex flex-col gap-1 mt-3 text-xs text-muted-foreground">
          {task.dueDate && (
            <div className="flex items-center">
              <Calendar className="h-3.5 w-3.5 mr-1" />
              Due: {format(task.dueDate, "MMM d, yyyy")}
            </div>
          )}

          {task.assignedTo && (
            <div className="flex items-center">
              <span>Assigned to: {task.assignedTo}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="!p-2 flex justify-end border-t">
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => onEdit(task)}>
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(task)}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
