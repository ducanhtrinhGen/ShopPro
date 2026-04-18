type AccountMetricsRowProps = {
  totalOrders: number;
  completedOrders: number;
  totalSpentFormatted: string;
};

/** Compact summary — not large dashboard cards */
export function AccountMetricsRow({ totalOrders, completedOrders, totalSpentFormatted }: AccountMetricsRowProps) {
  return (
    <div className="account-metrics-row" aria-label="Tóm tắt đơn hàng">
      <span>
        <strong>{totalOrders}</strong> đơn
      </span>
      <span className="account-metrics-sep" aria-hidden="true">
        |
      </span>
      <span>
        <strong>{completedOrders}</strong> hoàn tất
      </span>
      <span className="account-metrics-sep" aria-hidden="true">
        |
      </span>
      <span>
        Chi tiêu <strong>{totalSpentFormatted}</strong>
      </span>
    </div>
  );
}
