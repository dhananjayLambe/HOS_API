"use client"

import { useState, useEffect } from "react"
import { DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { Plus, Search, LayoutGrid, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CreateTaskModal } from "@/components/tasks/create-task-modal"
import { EditTaskModal } from "@/components/tasks/edit-task-modal"
import { DeleteTaskDialog } from "@/components/tasks/delete-task-modal"
import { TaskItem } from "@/components/tasks/task-item"
import { TaskCard } from "@/components/tasks/task-card"

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

// Sample data
const initialTasks: Task[] = [
  {
    id: "task-1",
    title: "Review patient records",
    description: "Go through the latest patient records and update the system",
    status: "todo",
    priority: "high",
    dueDate: new Date(Date.now() + 86400000), // tomorrow
    createdAt: new Date(),
    assignedTo: "Dr. Sarah Johnson",
  },
  {
    id: "task-2",
    title: "Order medical supplies",
    description: "Check inventory and place orders for depleted items",
    status: "in-progress",
    priority: "medium",
    dueDate: new Date(Date.now() + 172800000), // day after tomorrow
    createdAt: new Date(Date.now() - 86400000), // yesterday
    assignedTo: "Nurse Wilson",
  },
  {
    id: "task-3",
    title: "Schedule staff meeting",
    description: "Arrange monthly staff meeting and prepare agenda",
    status: "completed",
    priority: "low",
    dueDate: new Date(Date.now() - 86400000), // yesterday
    createdAt: new Date(Date.now() - 172800000), // 2 days ago
    assignedTo: "Admin Staff",
  },
  {
    id: "task-4",
    title: "Update clinic protocols",
    description: "Review and update clinic protocols based on new guidelines",
    status: "todo",
    priority: "high",
    dueDate: new Date(Date.now() + 259200000), // 3 days from now
    createdAt: new Date(Date.now() - 43200000), // 12 hours ago
    assignedTo: "Dr. Sarah Johnson",
  },
  {
    id: "task-5",
    title: "Follow up with patients",
    description: "Call patients who had appointments last week for follow-up",
    status: "in-progress",
    priority: "medium",
    dueDate: new Date(Date.now() + 86400000), // tomorrow
    createdAt: new Date(Date.now() - 129600000), // 1.5 days ago
    assignedTo: "Nurse Wilson",
  },
  {
    id: "task-6",
    title: "Prepare monthly report",
    description: "Compile statistics and prepare the monthly clinic performance report",
    status: "todo",
    priority: "high",
    dueDate: new Date(Date.now() + 345600000), // 4 days from now
    createdAt: new Date(Date.now() - 21600000), // 6 hours ago
    assignedTo: "Dr. Sarah Johnson",
  },
  {
    id: "task-7",
    title: "Organize patient files",
    description: "Sort and organize physical patient files in the storage room",
    status: "todo",
    priority: "low",
    dueDate: new Date(Date.now() + 432000000), // 5 days from now
    createdAt: new Date(Date.now() - 64800000), // 18 hours ago
    assignedTo: "Admin Staff",
  },
  {
    id: "task-8",
    title: "Update software systems",
    description: "Install latest updates for the clinic management software",
    status: "in-progress",
    priority: "medium",
    dueDate: new Date(Date.now() + 172800000), // 2 days from now
    createdAt: new Date(Date.now() - 108000000), // 30 hours ago
    assignedTo: "IT Support",
  },
]

// DND item types
const ItemTypes = {
  TASK: "task",
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [filteredTasks, setFilteredTasks] = useState<Task[]>(initialTasks)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [currentTask, setCurrentTask] = useState<Task | null>(null)

  // Apply filters
  useEffect(() => {
    let result = [...tasks]

    // Apply search filter
    if (searchQuery) {
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter((task) => task.status === statusFilter)
    }

    // Apply priority filter
    if (priorityFilter !== "all") {
      result = result.filter((task) => task.priority === priorityFilter)
    }

    setFilteredTasks(result)
  }, [tasks, searchQuery, statusFilter, priorityFilter])

  // Move task function for drag and drop
  const moveTask = (dragIndex: number, hoverIndex: number) => {
    const draggedTask = filteredTasks[dragIndex]

    // Create new array without mutating the original
    const newTasks = [...filteredTasks]
    newTasks.splice(dragIndex, 1)
    newTasks.splice(hoverIndex, 0, draggedTask)

    setFilteredTasks(newTasks)

    // Update the main tasks array to reflect the new order
    const updatedMainTasks = [...tasks]
    const taskIds = newTasks.map((task) => task.id)

    // Sort the main tasks array based on the new order
    updatedMainTasks.sort((a, b) => {
      const indexA = taskIds.indexOf(a.id)
      const indexB = taskIds.indexOf(b.id)

      if (indexA === -1) return 1
      if (indexB === -1) return -1

      return indexA - indexB
    })

    setTasks(updatedMainTasks)
  }

  // Create a new task
  const handleCreateTask = (newTask: Omit<Task, "id" | "createdAt">) => {
    const task: Task = {
      ...newTask,
      id: `task-${Date.now()}`,
      createdAt: new Date(),
    }
    setTasks([...tasks, task])
    setCreateModalOpen(false)
  }

  // Edit a task
  const handleEditTask = (updatedTask: Task) => {
    setTasks(tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task)))
    setEditModalOpen(false)
    setCurrentTask(null)
  }

  // Delete a task
  const handleDeleteTask = () => {
    if (currentTask) {
      setTasks(tasks.filter((task) => task.id !== currentTask.id))
      setDeleteDialogOpen(false)
      setCurrentTask(null)
    }
  }

  // Toggle task completion
  const toggleTaskCompletion = (taskId: string) => {
    setTasks(
      tasks.map((task) => {
        if (task.id === taskId) {
          return {
            ...task,
            status: task.status === "completed" ? "todo" : "completed",
          }
        }
        return task
      }),
    )
  }

  // Open edit modal
  const openEditModal = (task: Task) => {
    setCurrentTask(task)
    setEditModalOpen(true)
  }

  // Open delete dialog
  const openDeleteDialog = (task: Task) => {
    setCurrentTask(task)
    setDeleteDialogOpen(true)
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Tasks</h1>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Task
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex border rounded-md">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                className="rounded-r-none"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
                <span className="sr-only">List view</span>
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                className="rounded-l-none"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="sr-only">Grid view</span>
              </Button>
            </div>
          </div>
        </div>

        <Card className="flex-1">
          <CardHeader className="pb-3">
            <CardTitle>Task List</CardTitle>
            <CardDescription>
              Manage your tasks and track progress • {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {viewMode === "list" ? (
              <div className="space-y-4">
                {filteredTasks.length > 0 ? (
                  filteredTasks.map((task, index) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      index={index}
                      moveTask={moveTask}
                      toggleCompletion={toggleTaskCompletion}
                      onEdit={openEditModal}
                      onDelete={openDeleteDialog}
                    />
                  ))
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    No tasks found. Create a new task or adjust your filters.
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTasks.length > 0 ? (
                  filteredTasks.map((task, index) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      index={index}
                      moveTask={moveTask}
                      toggleCompletion={toggleTaskCompletion}
                      onEdit={openEditModal}
                      onDelete={openDeleteDialog}
                    />
                  ))
                ) : (
                  <div className="text-center py-6 text-muted-foreground col-span-full">
                    No tasks found. Create a new task or adjust your filters.
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t !pt-4 text-xs text-muted-foreground">
            Drag tasks to reorder • {viewMode === "grid" ? "Grid" : "List"} view
          </CardFooter>
        </Card>

        <CreateTaskModal open={createModalOpen} onOpenChange={setCreateModalOpen} onCreateTask={handleCreateTask} />

        {currentTask && (
          <EditTaskModal
            open={editModalOpen}
            onOpenChange={setEditModalOpen}
            task={currentTask}
            onUpdateTask={handleEditTask}
          />
        )}

        <DeleteTaskDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleDeleteTask}
          taskTitle={currentTask?.title || ""}
        />
      </div>
    </DndProvider>
  )
}
