"use client";

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  label: string;
}

export function DataTable<TData>({ data, columns, label }: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="data-table" role="table" aria-label={label}>
      <div className="data-row data-head" role="row">
        {table.getFlatHeaders().map((header) => (
          <button
            key={header.id}
            className="data-header-cell"
            type="button"
            onClick={header.column.getToggleSortingHandler()}
            style={{
              background: "none",
              border: "none",
              cursor: header.column.getCanSort() ? "pointer" : "default",
              font: "inherit",
              color: "inherit",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: 0,
            }}
          >
            {flexRender(header.column.columnDef.header, header.getContext())}
            {header.column.getCanSort() ? (
              header.column.getIsSorted() === "asc" ? (
                <ArrowUp size={12} />
              ) : header.column.getIsSorted() === "desc" ? (
                <ArrowDown size={12} />
              ) : (
                <ArrowUpDown size={12} opacity={0.4} />
              )
            ) : null}
          </button>
        ))}
      </div>
      {table.getRowModel().rows.map((row) => (
        <div className="data-row" role="row" key={row.id}>
          {row.getVisibleCells().map((cell) => (
            <span key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

