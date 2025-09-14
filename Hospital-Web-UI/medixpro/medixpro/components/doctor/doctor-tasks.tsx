"use client"

import { CheckCircle2, Clock, FileText, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useState } from "react"

export function DoctorTasks() {
  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: "Review lab results for Emma Thompson",
      priority: "High",
      due: "Today, 2:00 PM",
      completed: false,
    },
    {
      id: 2,
      title: "Complete medical certificate for James Wilson",
      priority: "Medium",
      due: "Today, 4:00 PM",
      completed: false,
    },
    {
      id: 3,
      title: "Follow up on Michael Chen's medication",
      priority: "High",
      due: "Today, 5:00 PM",
      completed: false,
    },
    {
      id: 4,
      title: "Review treatment plan for Sophia Rodriguez",
      priority: "Medium",
      due: "Tomorrow, 10:00 AM",
      completed: false,
    },
    {
      id: 5,
      title: "Sign off on nurse practitioner notes",
      priority: "Low",
      due: "Tomorrow, 3:00 PM",
      completed: true,
    },
  ])

  const handleTaskComplete = (taskId: number) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: true } : task
    ))
  }

  const handleTaskUncomplete = (taskId: number) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: false } : task
    ))
  }

  const handleCheckboxChange = (taskId: number) => {
    const task = tasks.find(t => t.id === taskId)
    if (task) {
      if (task.completed) {
        handleTaskUncomplete(taskId)
      } else {
        handleTaskComplete(taskId)
      }
    }
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <div
          key={task.id}
          className={`flex items-start justify-between gap-4 flex-wrap rounded-lg border p-3 transition-all ${
            task.completed ? "bg-muted/50" : "hover:bg-accent"
          }`}
        >
          <div className="flex items-center flex-wrap gap-3">
            <Checkbox 
              id={`task-${task.id}`} 
              checked={task.completed} 
              onCheckedChange={() => handleCheckboxChange(task.id)}
            />
            <div>
              <label
                htmlFor={`task-${task.id}`}
                className={`font-medium block mb-1 ${task.completed ? "line-through text-muted-foreground" : ""}`}
              >
                {task.title}
              </label>
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="mr-1 h-3 w-3" />
                {task.due}
                <span
                  className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    task.priority === "High"
                      ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                      : task.priority === "Medium"
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                  }`}
                >
                  {task.priority}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {task.completed ? (
              <Button 
                size="icon" 
                variant="ghost"
                onClick={() => handleTaskUncomplete(task.id)}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button size="icon" variant="ghost">
                  <FileText className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost"
                  onClick={() => handleTaskComplete(task.id)}
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
