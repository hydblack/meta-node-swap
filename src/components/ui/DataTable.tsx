import { useMemo, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────

/** 单列定义 */
export interface Column<T> {
  /** 列头显示文字 */
  header: string;
  /** 渲染单元格内容，接收行数据和行索引 */
  render: (row: T, index: number) => React.ReactNode;
  /** 表格单元格 class（如 text-right 用于右对齐） */
  cellClassName?: string;
  /** 表格表头 class */
  headerClassName?: string;
}

/** 分页配置选项 */
export interface PaginationConfig {
  /** 当前页码（从1开始） */
  page: number;
  /** 每页条数 */
  pageSize: number;
  /** 可选的每页条数列表 */
  pageSizeOptions?: number[];
  /** 总数据条数（用于计算总页数） */
  total: number;
  /** 页码变化回调 */
  onPageChange: (page: number) => void;
  /** 每页条数变化回调 */
  onPageSizeChange: (size: number) => void;
}

export interface DataTableProps<T> {
  /** 数据源（已分页后的数据） */
  data: T[];
  /** 列定义 */
  columns: Column<T>[];
  /** 是否正在加载 */
  loading?: boolean;
  /** 加载时骨架屏行数，默认 5 */
  skeletonRows?: number;
  /** 空状态文案 */
  emptyText?: string;
  /** 空状态自定义渲染 */
  emptyRender?: () => React.ReactNode;
  /** 分页配置，不传则不显示分页 */
  pagination?: PaginationConfig;
  /** 整体容器额外 className */
  className?: string;
  /** 是否启用斑马纹，默认 true */
  zebra?: boolean;
  /** 行 hover 高亮，默认 true */
  hoverable?: boolean;
  /** 固定表头，需要配合 max-h 和 overflow-auto 使用 */
  pinnedRows?: boolean;
}

// ─── Skeleton Row ────────────────────────────────────────────────

function SkeletonRow({ colCount }: { colCount: number }) {
  return (
    <tr>
      {Array.from({ length: colCount }).map((_, i) => (
        <td key={i}>
          <div className="h-4 w-3/4 rounded bg-base-300" />
        </td>
      ))}
    </tr>
  );
}

// ─── Pagination (daisyUI join buttons) ──────────────────────────

function DataTablePagination({
  pagination,
}: {
  pagination: NonNullable<PaginationConfig>;
}) {
  const {
    page,
    pageSize,
    pageSizeOptions = [10, 20, 50],
    total,
    onPageChange,
    onPageSizeChange,
  } = pagination;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  // 生成页码数组（含省略号）
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

    const delta = 2;
    const range: (number | "...")[] = [];
    const left = Math.max(2, safePage - delta);
    const right = Math.min(totalPages - 1, safePage + delta);

    range.push(1);
    if (left > 2) range.push("...");
    for (let i = left; i <= right; i++) range.push(i);
    if (right < totalPages - 1) range.push("...");
    range.push(totalPages);

    return range;
  }, [safePage, totalPages]);

  const startIdx = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIdx = Math.min(safePage * pageSize, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-base-300">
      {/* 左侧：条目信息 + 每页条数选择 */}
      <div className="hidden sm:flex items-center gap-4">
        <span className="text-sm opacity-60">
          共 <span className="font-medium opacity-80">{total}</span> 条，
          第{" "}
          <span className="font-medium opacity-80">
            {startIdx}&ndash;{endIdx}
          </span>{" "}
          条
        </span>
        <div className="join join-horizontal">
          {(pageSizeOptions).map((size) => (
            <button
              key={size}
              onClick={() => onPageSizeChange(size)}
              className={`btn btn-xs join-item ${
                pageSize === size
                  ? "btn-active"
                  : "btn-ghost"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* 右侧：页码导航 */}
      <div className="join join-horizontal">
        <button
          className="btn btn-xs btn-square join-item"
          onClick={() => onPageChange(1)}
          disabled={safePage <= 1}
          title="首页"
        >
          &laquo;&laquo;
        </button>
        <button
          className="btn btn-xs btn-square join-item"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          title="上一页"
        >
          «
        </button>
        {pageNumbers.map((p, idx) =>
          p === "..." ? (
            <button
              key={`e-${idx}`}
              className="btn btn-xs join-item btn-disabled"
              tabIndex={-1}
            >
              …
            </button>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`btn btn-xs join-item ${
                safePage === p ? "btn-active" : "btn-ghost"
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button
          className="btn btn-xs btn-square join-item"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          title="下一页"
        >
          »
        </button>
        <button
          className="btn btn-xs btn-square join-item"
          onClick={() => onPageChange(totalPages)}
          disabled={safePage >= totalPages}
          title="末页"
        >
          &raquo;&raquo;
        </button>
      </div>

      {/* 移动端：简化信息 */}
      <div className="sm:hidden text-xs opacity-60">
        第 {startIdx}–{endIdx} / 共 {total} 条
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

/**
 * 通用 DataTable 组件
 *
 * 基于 Tailwind CSS + daisyUI 的可复用表格组件，支持：
 * - 泛型列定义（columns）
 * - 内置分页（pagination）
 * - 骨架屏加载态（loading）
 * - 空状态（emptyRender）
 *
 * @example
 * ```tsx
 * <DataTable<PoolInfo>
 *   data={pagedData}
 *   columns={[
 *     { header: "Token", render: (row) => row.token0Symbol },
 *     { header: "Liquidity", render: (row) => row.liquidity },
 *   ]}
 *   pagination={{ page, pageSize, total, onPageChange, onPageSizeChange }}
 *   loading={isLoading}
 * />
 * ```
 */
export default function DataTable<T extends object>({
  data,
  columns,
  loading = false,
  skeletonRows = 5,
  emptyText = "暂无数据",
  emptyRender,
  pagination,
  className = "",
  zebra = true,
  hoverable = true,
  pinnedRows = false,
}: DataTableProps<T>) {
  // 内部 state：当外部未传分页时，提供默认分页支持
  const [internalPage, setInternalPage] = useState(1);

  const tableClass = [
    "table",
    zebra && "table-zebra",
    hoverable && "table-hover",
    pinnedRows && "table-pin-rows",
    "w-full",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`card bg-base-100 shadow-xl overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className={tableClass}>
          {/* Table Header */}
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className={`${col.headerClassName || ""}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {loading
              ? Array.from({ length: skeletonRows }).map((_, i) => (
                  <SkeletonRow key={i} colCount={columns.length} />
                ))
              : data.length > 0
                ? data.map((row, rowIndex) => (
                    <tr key={(row as any)?.id ?? rowIndex}>
                      {columns.map((col, colIndex) => (
                        <td key={colIndex} className={`${col.cellClassName || ""}`}>
                          {col.render(row, rowIndex)}
                        </td>
                      ))}
                    </tr>
                  ))
                : null}
          </tbody>
        </table>

        {/* Empty State */}
        {!loading && data.length === 0 && (
          <div className="py-16 text-center">
            {emptyRender ? (
              emptyRender()
            ) : (
              <>
                <div className="text-4xl mb-2">📊</div>
                <p className="text-base-content/60">{emptyText}</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && !loading && (
        <DataTablePagination pagination={pagination} />
      )}

      {/* Internal Pagination (when no external pagination provided) */}
      {!pagination && !loading && data.length > 0 && (
        <DataTablePagination
          pagination={{
            page: internalPage,
            pageSize: data.length, // no internal paging by default
            total: data.length,
            onPageChange: setInternalPage,
            onPageSizeChange: () => {},
          }}
        />
      )}
    </div>
  );
}
