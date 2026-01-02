"use client"

import { useState, useEffect, useRef } from "react"
import { DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { Plus, Search, LayoutGrid, List, CheckCircle2, Clock, Circle, TrendingUp, Filter, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CreateTaskModal } from "@/components/tasks/create-task-modal"
import { EditTaskModal } from "@/components/tasks/edit-task-modal"
import { DeleteTaskDialog } from "@/components/tasks/delete-task-modal"
import { TaskItem } from "@/components/tasks/task-item"
import { TaskCard } from "@/components/tasks/task-card"
import { getTasks, createTask, updateTask, patchTask, deleteTask, type Task } from "@/lib/tasksApi"
import { useToastNotification } from "@/hooks/use-toast-notification"

// DND item types
const ItemTypes = {
  TASK: "task",
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [currentTask, setCurrentTask] = useState<Task | null>(null)

  const toast = useToastNotification()
  const isFetchingRef = useRef(false)

  // Fetch tasks from API on mount only
  useEffect(() => {
    // Prevent multiple simultaneous calls
    if (isFetchingRef.current) {
      return
    }

    const fetchTasks = async () => {
      if (isFetchingRef.current) {
        return
      }
      
      try {
        isFetchingRef.current = true
        setIsLoading(true)
        // Fetch all tasks - we'll do client-side filtering
        const response = await getTasks()
        
        if (response.success && response.results) {
          setTasks(response.results)
        } else {
          setTasks([])
        }
      } catch (error: any) {
        console.error("Error fetching tasks:", error)
        // Only show error toast once, not on every retry
        if (error.response?.status !== 404) {
          toast.error(error.message || "Failed to load tasks")
        }
        setTasks([])
      } finally {
        setIsLoading(false)
        isFetchingRef.current = false
      }
    }

    fetchTasks()

    // Cleanup function
    return () => {
      isFetchingRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only fetch on mount

  // Calculate task statistics
  const taskStats = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === "todo").length,
    inProgress: tasks.filter((t) => t.status === "in-progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    high: tasks.filter((t) => t.priority === "high").length,
  }

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
  const handleCreateTask = async (newTask: Omit<Task, "id" | "createdAt">) => {
    try {
      setIsCreating(true)
      const response = await createTask(newTask)
      
      if (response.success && response.data) {
        setTasks([...tasks, response.data])
        toast.success("Task created successfully!")
        setCreateModalOpen(false)
      } else {
        toast.error(response.message || "Failed to create task")
      }
    } catch (error: any) {
      console.error("Error creating task:", error)
      toast.error(error.message || "Failed to create task")
    } finally {
      setIsCreating(false)
    }
  }

  // Edit a task
  const handleEditTask = async (updatedTask: Task) => {
    try {
      setIsUpdating(updatedTask.id)
      const response = await updateTask(updatedTask.id, {
        title: updatedTask.title,
        description: updatedTask.description,
        status: updatedTask.status,
        priority: updatedTask.priority,
        dueDate: updatedTask.dueDate,
      })
      
      if (response.success) {
        // Update the task in the list if we got the updated task back
        if (response.data) {
          setTasks(tasks.map((t) => (t.id === updatedTask.id ? response.data! : t)))
        } else {
          // Fallback: refresh tasks from API if no data returned
          const refreshResponse = await getTasks()
          if (refreshResponse.success && refreshResponse.results) {
            setTasks(refreshResponse.results)
          }
        }
        toast.success("Task updated successfully!")
        setEditModalOpen(false)
        setCurrentTask(null)
      } else {
        toast.error(response.message || "Failed to update task")
      }
    } catch (error: any) {
      console.error("Error updating task:", error)
      toast.error(error.message || "Failed to update task")
    } finally {
      setIsUpdating(null)
    }
  }

  // Delete a task
  const handleDeleteTask = async () => {
    if (!currentTask) return

    try {
      setIsUpdating(currentTask.id)
      const response = await deleteTask(currentTask.id)
      
      if (response.success) {
        setTasks(tasks.filter((task) => task.id !== currentTask.id))
        toast.success("Task deleted successfully!")
        setDeleteDialogOpen(false)
        setCurrentTask(null)
      } else {
        toast.error(response.message || "Failed to delete task")
      }
    } catch (error: any) {
      console.error("Error deleting task:", error)
      toast.error(error.message || "Failed to delete task")
    } finally {
      setIsUpdating(null)
    }
  }

  // Toggle task completion
  const toggleTaskCompletion = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    const newStatus = task.status === "completed" ? "todo" : "completed"
    
    try {
      setIsUpdating(taskId)
      const response = await patchTask(taskId, { status: newStatus })
      
      if (response.success) {
        // Update local state with the returned task data if available
        if (response.data) {
          setTasks(tasks.map((t) => (t.id === taskId ? response.data! : t)))
        } else {
          // Fallback: update optimistically
          setTasks(
            tasks.map((t) => {
              if (t.id === taskId) {
                return { ...t, status: newStatus }
              }
              return t
            }),
          )
        }
        toast.success(`Task marked as ${newStatus === "completed" ? "completed" : "to do"}!`)
      } else {
        toast.error(response.message || "Failed to update task status")
      }
    } catch (error: any) {
      console.error("Error toggling task completion:", error)
      toast.error(error.message || "Failed to update task status")
    } finally {
      setIsUpdating(null)
    }
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
        {/* Header Section with Gradient */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Tasks
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Manage and track your team's tasks efficiently</p>
          </div>
          <Button 
            onClick={() => setCreateModalOpen(true)}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Task
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Tasks</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{taskStats.total}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-500/20">
                  <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950/30 dark:to-gray-900/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">To Do</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{taskStats.todo}</p>
                </div>
                <div className="p-3 rounded-full bg-gray-500/20">
                  <Circle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-300">In Progress</p>
                  <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{taskStats.inProgress}</p>
                </div>
                <div className="p-3 rounded-full bg-amber-500/20">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">Completed</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">{taskStats.completed}</p>
                </div>
                <div className="p-3 rounded-full bg-green-500/20">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Section */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              className="pl-8 border-2 focus:border-violet-500 focus:ring-violet-500/20 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] border-2 focus:border-violet-500">
                <div className="flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5" />
                  <SelectValue placeholder="Status" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px] border-2 focus:border-violet-500">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex border-2 rounded-md overflow-hidden">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                className={`rounded-r-none ${viewMode === "list" ? "bg-violet-600 hover:bg-violet-700" : ""}`}
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
                <span className="sr-only">List view</span>
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                className={`rounded-l-none ${viewMode === "grid" ? "bg-violet-600 hover:bg-violet-700" : ""}`}
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="sr-only">Grid view</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Main Task Card */}
        <Card className="flex-1 border-2 shadow-lg">
          <CardHeader className="pb-3 bg-gradient-to-r from-violet-50 via-purple-50 to-indigo-50 dark:from-violet-950/20 dark:via-purple-950/20 dark:to-indigo-950/20 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-violet-900 dark:text-violet-100">Task List</CardTitle>
                <CardDescription className="mt-1">
                  Manage your tasks and track progress • <span className="font-semibold text-violet-700 dark:text-violet-300">{filteredTasks.length}</span> task{filteredTasks.length !== 1 ? "s" : ""}
                </CardDescription>
              </div>
              {taskStats.high > 0 && (
                <div className="px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700">
                  <span className="text-xs font-semibold text-red-700 dark:text-red-300">
                    {taskStats.high} High Priority
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                <span className="ml-2 text-muted-foreground">Loading tasks...</span>
              </div>
            ) : viewMode === "list" ? (
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
                      isUpdating={isUpdating === task.id}
                    />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 mb-4">
                      <Circle className="h-8 w-8 text-violet-500 dark:text-violet-400" />
                    </div>
                    <p className="text-lg font-medium text-muted-foreground mb-2">No tasks found</p>
                    <p className="text-sm text-muted-foreground">Create a new task or adjust your filters</p>
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
                      isUpdating={isUpdating === task.id}
                    />
                  ))
                ) : (
                  <div className="text-center py-12 col-span-full">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 mb-4">
                      <Circle className="h-8 w-8 text-violet-500 dark:text-violet-400" />
                    </div>
                    <p className="text-lg font-medium text-muted-foreground mb-2">No tasks found</p>
                    <p className="text-sm text-muted-foreground">Create a new task or adjust your filters</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950/50 dark:to-gray-950/50 !pt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse"></div>
              <span>Drag tasks to reorder • {viewMode === "grid" ? "Grid" : "List"} view</span>
            </div>
          </CardFooter>
        </Card>

        <CreateTaskModal 
          open={createModalOpen} 
          onOpenChange={setCreateModalOpen} 
          onCreateTask={handleCreateTask}
          isLoading={isCreating}
        />

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

