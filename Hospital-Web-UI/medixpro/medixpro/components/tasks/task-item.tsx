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
}

// DND item types
const ItemTypes = {
  TASK: "task",
};

export function TaskItem({ task, index, moveTask, toggleCompletion, onEdit, onDelete }: TaskItemProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return (
          <Badge variant="destructive" className="ml-2">
            High
          </Badge>
        );
      case "medium":
        return (
          <Badge variant="default" className="ml-2 bg-amber-500">
            Medium
          </Badge>
        );
      case "low":
        return (
          <Badge variant="outline" className="ml-2">
            Low
          </Badge>
        );
      default:
        return null;
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "in-progress":
        return <Clock className="h-5 w-5 text-blue-500" />;
      case "todo":
        return <Circle className="h-5 w-5 text-gray-400" />;
      default:
        return null;
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
    <div ref={dragPreview as any} className={`p-4 rounded-lg border ${task.status === "completed" ? "bg-muted/50" : "bg-card"} ${isDragging ? "opacity-50" : "opacity-100"}`}>
      <div className="flex items-start flex-wrap gap-3">
        <div className="flex items-start grow gap-3">
          <div ref={ref} className="mt-1 cursor-move">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>

          <Checkbox checked={task.status === "completed"} onCheckedChange={() => toggleCompletion(task.id)} className="mt-1" />

          <div className="flex-1">
            <div className="flex items-center">
              <h3 className={`font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{task.title}</h3>
              {getPriorityBadge(task.priority)}
            </div>

            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>

            <div className="flex flex-wrap gap-3 mt-3">
              <div className="flex items-center text-xs text-muted-foreground">
                {getStatusIcon(task.status)}
                <span className="ml-1 capitalize">{task.status.replace("-", " ")}</span>
              </div>

              {task.dueDate && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 mr-1" />
                  Due: {format(task.dueDate, "MMM d, yyyy")}
                </div>
              )}

              {task.assignedTo && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <span>Assigned to: {task.assignedTo}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="icon" onClick={() => onEdit(task)}>
            <Edit className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(task)}>
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
