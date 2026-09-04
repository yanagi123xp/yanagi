"use client";

// 分析画面：前月比・年収予測・残業分析・各種グラフをまとめて表示する。
import { useSalaryData } from "@/context/SalaryDataContext";
import Card from "@/components/Card";
import ComparisonRow from "@/components/ComparisonRow";
import MonthlyTrendChart from "@/components/charts/MonthlyTrendChart";
import OvertimeTrendChart from "@/components/charts/OvertimeTrendChart";
import YearlyIncomeChart from "@/components/charts/YearlyIncomeChart";
import { formatHours, formatYen, formatYenSigned } from "@/lib/format";
import {
  analyzeOvertime,
  compareToPrevious,
  findCurrentOrLatestRecord,
  forecastAnnualIncome,
  netPay,
  sortByYearMonthAsc,
  totalIncome,
} from "@/lib/salary/calc";

export default function AnalyticsPage() {
  const { records, loading, errorMessage } = useSalaryData();

  if (loading) {
    return <p className="pt-10 text-center text-sm text-muted">読み込み中...</p>;
  }
  if (errorMessage) {
    return <p className="pt-10 text-center text-sm text-negative">{errorMessage}</p>;
  }
  if (records.length === 0) {
    return (
      <p className="pt-10 text-center text-sm text-muted">
        分析するデータがまだありません。まずは給与を登録してください。
      </p>
    );
  }

  const { record: current } = findCurrentOrLatestRecord(records);
  const sortedAsc = sortByYearMonthAsc(records);
  const currentIndex = current ? sortedAsc.findIndex((r) => r.id === current.id) : -1;
  const previous = currentIndex > 0 ? sortedAsc[currentIndex - 1] : undefined;

  const netComparison = compareToPrevious(
    current ? netPay(current) : 0,
    previous ? netPay(previous) : undefined
  );
  const incomeComparison = compareToPrevious(
    current ? totalIncome(current) : 0,
    previous ? totalIncome(previous) : undefined
  );
  const overtimePayComparison = compareToPrevious(
    current?.overtime_pay ?? 0,
    previous?.overtime_pay
  );
  const overtimeHoursComparison = compareToPrevious(
    current?.overtime_hours ?? 0,
    previous?.overtime_hours
  );

  const forecast = current ? forecastAnnualIncome(records, current.year) : undefined;
  const overtime = current ? analyzeOvertime(records, current.year, current) : undefined;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold text-gray-900">分析</h1>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">前月比</h2>
        <Card className="divide-y divide-card-border">
          <ComparisonRow
            label="手取り"
            currentText={formatYen(current ? netPay(current) : 0)}
            diffText={formatYenSigned(netComparison.diff)}
            percent={netComparison.percent}
          />
          <ComparisonRow
            label="総支給額"
            currentText={formatYen(current ? totalIncome(current) : 0)}
            diffText={formatYenSigned(incomeComparison.diff)}
            percent={incomeComparison.percent}
          />
          <ComparisonRow
            label="残業代"
            currentText={formatYen(current?.overtime_pay ?? 0)}
            diffText={formatYenSigned(overtimePayComparison.diff)}
            percent={overtimePayComparison.percent}
          />
          <ComparisonRow
            label="残業時間"
            currentText={formatHours(current?.overtime_hours ?? 0)}
            diffText={`${overtimeHoursComparison.diff >= 0 ? "+" : ""}${overtimeHoursComparison.diff.toFixed(1)}時間`}
            percent={overtimeHoursComparison.percent}
          />
        </Card>
        {!previous && (
          <p className="mt-2 text-xs text-muted">比較できる前月のデータがありません。</p>
        )}
      </section>

      {forecast && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">年収予測</h2>
          <Card>
            <p className="text-xs text-muted">現在の年間総支給（{forecast.monthsRecorded}ヶ月分）</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-gray-900">
              {formatYen(forecast.currentYearIncome)}
            </p>
            <div className="my-4 border-t border-card-border" />
            <p className="text-xs text-muted">今年の予想年収（単純平均 × 12ヶ月）</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-accent">
              {formatYen(forecast.forecastedAnnualIncome)}
            </p>
          </Card>
        </section>
      )}

      {overtime && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">残業分析</h2>
          <Card>
            <div className="grid grid-cols-2 gap-y-4">
              <AnalysisItem label="今月の残業時間" value={formatHours(overtime.thisMonthHours)} />
              <AnalysisItem label="今月の残業代" value={formatYen(overtime.thisMonthPay)} />
              <AnalysisItem
                label="残業単価（参考値）"
                value={overtime.hourlyRate !== null ? `${formatYen(overtime.hourlyRate)}/時` : "―"}
              />
              <AnalysisItem label="年間残業時間" value={formatHours(overtime.yearlyHours)} />
              <AnalysisItem
                label="月平均残業時間"
                value={formatHours(overtime.averageMonthlyHours)}
              />
            </div>
          </Card>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">月別 手取り・総支給の推移</h2>
        <Card>
          <MonthlyTrendChart records={records} />
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">月別 残業時間の推移</h2>
        <Card>
          <OvertimeTrendChart records={records} />
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">年別 年収の推移</h2>
        <Card>
          <YearlyIncomeChart records={records} />
        </Card>
      </section>
    </div>
  );
}

function AnalysisItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-base font-bold tabular-nums text-gray-900">{value}</p>
    </div>
  );
}
