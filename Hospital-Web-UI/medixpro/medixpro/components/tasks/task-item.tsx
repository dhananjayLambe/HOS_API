"use client";

import { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { format } from "date-fns";
import { CheckCircle2, Circle, Clock, Calendar, Edit, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

// Task type definition
interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in-progress" | "completed";
  priority: "low" | "medium" | "high";
  dueDate: Date | null;
  createdAt: Date;
  assignedTo?: string;
}

interface TaskItemProps {
  task: Task;
  index: number;
  moveTask: (dragIndex: number, hoverIndex: number) => void;
  toggleCompletion: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  isUpdating?: boolean;
}

// DND item types
const ItemTypes = {
  TASK: "task",
};

export function TaskItem({ task, index, moveTask, toggleCompletion, onEdit, onDelete, isUpdating = false }: TaskItemProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Get priority badge with enhanced colors
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return (
          <Badge className="ml-2 bg-gradient-to-r from-red-500 to-red-600 text-white border-0 shadow-sm hover:shadow-md transition-shadow">
            High
          </Badge>
        );
      case "medium":
        return (
          <Badge className="ml-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-sm hover:shadow-md transition-shadow">
            Medium
          </Badge>
        );
      case "low":
        return (
          <Badge className="ml-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 shadow-sm hover:shadow-md transition-shadow">
            Low
          </Badge>
        );
      default:
        return null;
    }
  };

  // Get status icon with enhanced colors
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case "in-progress":
        return <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
      case "todo":
        return <Circle className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
      default:
        return null;
    }
  };

  // Get status background gradient
  const getStatusBackground = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800";
      case "in-progress":
        return "bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200 dark:border-amber-800";
      case "todo":
        return "bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-gray-900/50 border-slate-200 dark:border-slate-700";
      default:
        return "bg-card border";
    }
  };

  // Set up drag
  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: ItemTypes.TASK,
    item: { index },
    collect: (monitor: any) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Set up drop
  const [, drop] = useDrop({
    accept: ItemTypes.TASK,
    hover(item: { index: number }, monitor: any) {
      if (!ref.current) {
        return;
      }

      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current.getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();

      // Get pixels to the top
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // Time to actually perform the action
      moveTask(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
  });

  // Initialize drag and drop refs
  drag(drop(ref));

  return (
    <div 
      ref={dragPreview as any} 
      className={`p-5 rounded-xl border-2 shadow-md hover:shadow-lg transition-all duration-200 ${getStatusBackground(task.status)} ${isDragging ? "opacity-50 scale-95" : "opacity-100"} ${task.status === "completed" ? "opacity-90" : ""}`}
    >
      <div className="flex items-start flex-wrap gap-3">
        <div className="flex items-start grow gap-3">
          <div ref={ref} className="mt-1 cursor-move hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>

          <Checkbox 
            checked={task.status === "completed"} 
            onCheckedChange={() => toggleCompletion(task.id)} 
            disabled={isUpdating}
            className="mt-1 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600" 
          />

          <div className="flex-1">
            <div className="flex items-center flex-wrap gap-2">
              <h3 className={`font-semibold text-base ${task.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {task.title}
              </h3>
              {getPriorityBadge(task.priority)}
            </div>

            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{task.description}</p>

            <div className="flex flex-wrap gap-4 mt-4">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                task.status === "completed" 
                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" 
                  : task.status === "in-progress"
                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              }`}>
                {getStatusIcon(task.status)}
                <span className="capitalize">{task.status.replace("-", " ")}</span>
              </div>

              {task.dueDate && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Due: {format(task.dueDate, "MMM d, yyyy")}</span>
                </div>
              )}

              {task.assignedTo && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-medium">
                  <span>👤 {task.assignedTo}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-1 justify-end">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onEdit(task)}
            disabled={isUpdating}
            className="hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
          >
            <Edit className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onDelete(task)}
            disabled={isUpdating}
            className="hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
