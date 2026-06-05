"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Job, PrototypeState } from "@/features/caredesk/domain/domain";
import { getCustomer, getDevice, deviceLabel } from "@/features/caredesk/domain/domain";
import { GripVertical } from "lucide-react";

const KANBAN_COLUMNS = [
  { id: "NEW JOB", label: "Baharu" },
  { id: "WAITING FADHIL REVIEW", label: "Semakan" },
  { id: "IN PROGRESS", label: "Dalam Servis" },
  { id: "READY PICKUP", label: "Sedia Pickup" },
  { id: "COMPLETE", label: "Selesai" },
];

function SortableJobCard({ job, state, onOpen }: { job: Job; state: PrototypeState; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: job.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const customer = getCustomer(state, job.customerId);
  const device = getDevice(state, job.deviceId);

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className="job-card"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      <div className="job-card-header" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button {...attributes} {...listeners} style={{ cursor: "grab", background: "none", border: "none", padding: 2 }}>
          <GripVertical size={14} />
        </button>
        <div className="job-number" style={{ flex: 1 }}>{job.jobIdDisplay}</div>
      </div>
      <div className="job-meta" style={{ marginTop: 4 }}>
        {customer.name} - {deviceLabel(device)}
      </div>
      <button className="secondary-button compact" style={{ marginTop: 8, width: "100%" }} type="button" onClick={() => onOpen(job.id)}>
        Buka
      </button>
    </motion.div>
  );
}

export function KanbanBoard({
  state,
  onOpen,
  onStatusChange,
}: {
  state: PrototypeState;
  onOpen: (id: string) => void;
  onStatusChange?: (jobId: string, newStatus: string) => void;
}) {
  const [columns] = useState(KANBAN_COLUMNS);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const jobId = active.id as string;
    const newStatus = over.id as string;
    if (newStatus && onStatusChange && jobId !== newStatus) {
      onStatusChange(jobId, newStatus);
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="kanban-board" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, overflowX: "auto" }}>
        {columns.map((col) => {
          const jobs = state.jobs.filter((j) => j.status === col.id);
          return (
            <div key={col.id} className="kanban-column panel" style={{ minWidth: 220, display: "flex", flexDirection: "column", gap: 10, padding: 12 }}>
              <div style={{ fontWeight: 700, fontSize: "var(--text-sm)", color: "var(--muted)", display: "flex", justifyContent: "space-between" }}>
                <span>{col.label}</span>
                <span style={{ background: "var(--panel-soft)", borderRadius: "var(--radius-md)", padding: "2px 8px" }}>{jobs.length}</span>
              </div>
              <SortableContext items={jobs.map((j) => j.id)} strategy={verticalListSortingStrategy}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 60 }}>
                  {jobs.map((job) => (
                    <SortableJobCard key={job.id} job={job} state={state} onOpen={onOpen} />
                  ))}
                  {jobs.length === 0 && (
                    <div style={{ color: "var(--muted)", fontSize: "var(--text-sm)", textAlign: "center", padding: 20, border: "1px dashed var(--line)", borderRadius: "var(--radius-md)" }}>
                      Tiada job
                    </div>
                  )}
                </div>
              </SortableContext>
            </div>
          );
        })}
      </div>
    </DndContext>
  );
}
