import axiosClient from "./axiosClient"

// Backend status: "todo", "in_progress", "done"
// Frontend status: "todo", "in-progress", "completed"
const mapStatusToBackend = (status: string): string => {
  if (status === "completed") return "done"
  if (status === "in-progress") return "in_progress"
  return status
}

const mapStatusFromBackend = (status: string): string => {
  if (status === "done") return "completed"
  if (status === "in_progress") return "in-progress"
  return status
}

// Map frontend Task to backend format
const mapTaskToBackend = (task: any) => {
  // Get current user ID from localStorage as default assigned_to
  const currentUserId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null
  
  // due_date is required in backend, default to today if not provided
  let dueDate = task.dueDate
  if (!dueDate) {
    // Set default to today
    dueDate = new Date()
  }
  
  return {
    title: task.title,
    description: task.description || "",
    status: mapStatusToBackend(task.status),
    priority: task.priority,
    due_date: new Date(dueDate).toISOString().split("T")[0],
    // assigned_to must be a user ID (UUID string), not a name
    // If assignedTo is provided and looks like a UUID, use it; otherwise use current user
    assigned_to: task.assignedTo && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(task.assignedTo)
      ? task.assignedTo
      : currentUserId || task.assignedTo,
  }
}

// Map backend Task to frontend format
const mapTaskFromBackend = (task: any): Task => {
  return {
    id: task.id,
    title: task.title,
    description: task.description || "",
    status: mapStatusFromBackend(task.status) as "todo" | "in-progress" | "completed",
    priority: task.priority as "low" | "medium" | "high",
    dueDate: task.due_date ? new Date(task.due_date) : null,
    createdAt: task.created_at ? new Date(task.created_at) : new Date(),
    assignedTo: task.assigned_to_name || task.assigned_to,
  }
}

export interface Task {
  id: string
  title: string
  description: string
  status: "todo" | "in-progress" | "completed"
  priority: "low" | "medium" | "high"
  dueDate: Date | null
  createdAt: Date
  assignedTo?: string
}

export interface CreateTaskRequest {
  title: string
  description?: string
  status?: "todo" | "in-progress" | "completed"
  priority?: "low" | "medium" | "high"
  dueDate?: Date | null
  assignedTo?: string
}

export interface UpdateTaskRequest {
  title?: string
  description?: string
  status?: "todo" | "in-progress" | "completed"
  priority?: "low" | "medium" | "high"
  dueDate?: Date | null
}

export interface TaskListResponse {
  success: boolean
  count?: number
  results?: Task[]
  message?: string
  data?: Task[]
}

export interface TaskResponse {
  success: boolean
  message: string
  data?: Task
}

export interface TaskFilterParams {
  status?: string
  priority?: string
  due_date?: string
  start_date?: string
  end_date?: string
  ordering?: string
}

/**
 * Get list of tasks with optional filters
 */
export async function getTasks(filters?: TaskFilterParams): Promise<TaskListResponse> {
  try {
    const params = new URLSearchParams()
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          // Map frontend status to backend status
          if (key === "status" && value) {
            params.append(key, mapStatusToBackend(value))
          } else {
            params.append(key, value.toString())
          }
        }
      })
    }

    const queryString = params.toString()
    const url = `/tasks${queryString ? `?${queryString}` : ""}`
    
    const response = await axiosClient.get(url)
    
    // Handle different response formats
    let tasks: Task[] = []
    
    // Check if response.data exists (axios wraps the response)
    const responseData = response.data || response
    
    if (responseData.success && responseData.results) {
      tasks = responseData.results.map(mapTaskFromBackend)
    } else if (responseData.success && responseData.data) {
      tasks = Array.isArray(responseData.data) 
        ? responseData.data.map(mapTaskFromBackend)
        : [mapTaskFromBackend(responseData.data)]
    } else if (Array.isArray(responseData)) {
      tasks = responseData.map(mapTaskFromBackend)
    } else if (responseData.results && Array.isArray(responseData.results)) {
      // Handle case where results is directly in response
      tasks = responseData.results.map(mapTaskFromBackend)
    }

    return {
      success: true,
      count: tasks.length,
      results: tasks,
    }
  } catch (error: any) {
    console.error("Error fetching tasks:", error)
    throw error
  }
}

/**
 * Get a single task by ID
 */
export async function getTask(taskId: string): Promise<TaskResponse> {
  try {
    const response = await axiosClient.get(`/tasks/${taskId}`)
    
    // Axios wraps the response in .data
    const responseData = response.data || response
    
    let task: Task | undefined
    if (responseData.success && responseData.data) {
      task = mapTaskFromBackend(responseData.data)
    } else if (responseData.id) {
      task = mapTaskFromBackend(responseData)
    } else if (responseData.data && responseData.data.id) {
      task = mapTaskFromBackend(responseData.data)
    }

    return {
      success: true,
      message: responseData.message || "Task retrieved successfully",
      data: task,
    }
  } catch (error: any) {
    console.error("Error fetching task:", error)
    throw error
  }
}

/**
 * Create a new task
 */
export async function createTask(data: CreateTaskRequest): Promise<TaskResponse> {
  try {
    const backendData = mapTaskToBackend(data)
    const response = await axiosClient.post("/tasks", backendData)
    
    // Axios wraps the response in .data
    const responseData = response.data || response
    
    let task: Task | undefined
    if (responseData.success && responseData.data) {
      task = mapTaskFromBackend(responseData.data)
    } else if (responseData.id) {
      task = mapTaskFromBackend(responseData)
    } else if (responseData.data && responseData.data.id) {
      // Handle case where data is nested
      task = mapTaskFromBackend(responseData.data)
    }

    return {
      success: true,
      message: responseData.message || "Task created successfully",
      data: task,
    }
  } catch (error: any) {
    console.error("Error creating task:", error)
    throw error
  }
}

/**
 * Update a task (full update)
 */
export async function updateTask(
  taskId: string,
  data: UpdateTaskRequest
): Promise<TaskResponse> {
  try {
    const backendData = mapTaskToBackend(data as any)
    const response = await axiosClient.put(`/tasks/${taskId}`, backendData)
    
    // Axios wraps the response in .data
    const responseData = response.data || response
    
    return {
      success: true,
      message: responseData.message || "Task updated successfully",
    }
  } catch (error: any) {
    console.error("Error updating task:", error)
    throw error
  }
}

/**
 * Partially update a task (status/priority only)
 */
export async function patchTask(
  taskId: string,
  data: { status?: "todo" | "in-progress" | "completed"; priority?: "low" | "medium" | "high" }
): Promise<TaskResponse> {
  try {
    const backendData: any = {}
    if (data.status !== undefined) {
      backendData.status = mapStatusToBackend(data.status)
    }
    if (data.priority !== undefined) {
      backendData.priority = data.priority
    }

    const response = await axiosClient.patch(`/tasks/${taskId}`, backendData)
    
    // Axios wraps the response in .data
    const responseData = response.data || response
    
    return {
      success: true,
      message: responseData.message || "Task updated successfully",
    }
  } catch (error: any) {
    console.error("Error patching task:", error)
    throw error
  }
}

/**
 * Delete a task (soft delete)
 */
export async function deleteTask(taskId: string): Promise<TaskResponse> {
  try {
    const response = await axiosClient.delete(`/tasks/${taskId}`)
    
    // Axios wraps the response in .data
    // DELETE might return empty response, so handle both cases
    const responseData = response.data || response
    
    return {
      success: true,
      message: responseData?.message || "Task deleted successfully",
    }
  } catch (error: any) {
    console.error("Error deleting task:", error)
    throw error
  }
}

