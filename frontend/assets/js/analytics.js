/* Financial Analytics & Custom Chart Engine */

const AnalyticsPage = {
  async init() {
    try {
      const data = await API.getAnalytics();
      this.renderSpendingTrendsChart(data.monthlySpendingTrends || []);
      this.renderCategoryPieChart(data.categoryBreakdown || {});
      this.renderIncomeVsExpenseChart(data.monthlySpendingTrends || []);
      this.renderSavingsGrowthChart(data.savingsGrowth || []);
    } catch (e) {
      console.error(e);
      Utils.showToast(e.message || 'Failed to load analytics data', 'danger');
    }
  },

  /* 1. Monthly Spending Trends - Canvas Line Chart */
  renderSpendingTrendsChart(trends) {
    const canvas = document.getElementById('spendingTrendsCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth || 600;
    const height = 280;
    canvas.width = width;
    canvas.height = height;

    if (!trends || trends.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('No spending trends data available yet', width / 2, height / 2);
      return;
    }

    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const maxVal = Math.max(100, ...trends.map(t => Math.max(t.income || 0, t.expense || 0))) * 1.15;

    ctx.clearRect(0, 0, width, height);

    // Draw Grid Lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = padding + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw Expense Line
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    trends.forEach((t, index) => {
      const divisor = Math.max(1, trends.length - 1);
      const x = padding + (chartWidth / divisor) * index;
      const y = height - padding - ((t.expense || 0) / maxVal) * chartHeight;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw Dots & Labels
    trends.forEach((t, index) => {
      const divisor = Math.max(1, trends.length - 1);
      const x = padding + (chartWidth / divisor) * index;
      const y = height - padding - ((t.expense || 0) / maxVal) * chartHeight;

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();

      // Month Label
      ctx.fillStyle = '#64748b';
      ctx.font = '12px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(t.month || '', x, height - 10);
    });
  },

  /* 2. Category Breakdown - Canvas Donut Chart */
  renderCategoryPieChart(categories) {
    const canvas = document.getElementById('categoryPieCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = 280;
    const height = 280;
    canvas.width = width;
    canvas.height = height;

    const total = Object.values(categories).reduce((acc, curr) => acc + (curr || 0), 0);
    let startAngle = 0;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 100;

    ctx.clearRect(0, 0, width, height);

    const legendContainer = document.getElementById('categoryPieLegend');
    if (legendContainer) legendContainer.innerHTML = '';

    if (total === 0) {
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#111827' : '#ffffff';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 65, 0, 2 * Math.PI);
      ctx.fill();

      if (legendContainer) {
        legendContainer.innerHTML = '<span style="font-size: 0.85rem; color: var(--text-muted);">No expenses recorded yet</span>';
      }
      return;
    }

    Object.entries(categories).forEach(([cat, amount]) => {
      const sliceAngle = (amount / total) * 2 * Math.PI;
      const color = Utils.getCategoryColor(cat);

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fill();

      startAngle += sliceAngle;

      if (legendContainer) {
        legendContainer.innerHTML += `
          <div class="legend-item">
            <span class="legend-dot" style="background-color: ${color};"></span>
            <span>${cat} (${Math.round((amount / total) * 100)}%)</span>
          </div>
        `;
      }
    });

    ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#111827' : '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 60, 0, 2 * Math.PI);
    ctx.fill();
  },

  /* 3. Income vs Expense - Bar Chart */
  renderIncomeVsExpenseChart(trends) {
    const canvas = document.getElementById('incomeVsExpenseCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth || 600;
    const height = 280;
    canvas.width = width;
    canvas.height = height;

    if (!trends || trends.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('No income vs expense data available yet', width / 2, height / 2);
      return;
    }

    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const maxVal = Math.max(100, ...trends.map(t => Math.max(t.income || 0, t.expense || 0))) * 1.15;
    const groupWidth = chartWidth / trends.length;
    const barWidth = groupWidth * 0.3;

    ctx.clearRect(0, 0, width, height);

    trends.forEach((t, i) => {
      const groupX = padding + i * groupWidth + groupWidth * 0.15;

      // Income Bar (Green)
      const incHeight = ((t.income || 0) / maxVal) * chartHeight;
      ctx.fillStyle = '#10b981';
      ctx.fillRect(groupX, height - padding - incHeight, barWidth, incHeight);

      // Expense Bar (Red)
      const expHeight = ((t.expense || 0) / maxVal) * chartHeight;
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(groupX + barWidth + 5, height - padding - expHeight, barWidth, expHeight);

      // Label
      ctx.fillStyle = '#64748b';
      ctx.font = '12px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(t.month || '', groupX + barWidth, height - 10);
    });
  },

  /* 4. Savings Growth Chart */
  renderSavingsGrowthChart(savings) {
    const canvas = document.getElementById('savingsGrowthCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth || 600;
    const height = 280;
    canvas.width = width;
    canvas.height = height;

    if (!savings || savings.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('No savings growth data available yet', width / 2, height / 2);
      return;
    }

    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const maxVal = Math.max(100, ...savings.map(s => s.amount || s.balance || 0)) * 1.2;

    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    savings.forEach((s, index) => {
      const divisor = Math.max(1, savings.length - 1);
      const x = padding + (chartWidth / divisor) * index;
      const y = height - padding - (((s.amount || s.balance || 0)) / maxVal) * chartHeight;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(padding + chartWidth, height - padding);
    ctx.lineTo(padding, height - padding);
    ctx.closePath();
    ctx.fill();

    // Line Path
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    savings.forEach((s, index) => {
      const divisor = Math.max(1, savings.length - 1);
      const x = padding + (chartWidth / divisor) * index;
      const y = height - padding - (((s.amount || s.balance || 0)) / maxVal) * chartHeight;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Labels
    savings.forEach((s, index) => {
      const divisor = Math.max(1, savings.length - 1);
      const x = padding + (chartWidth / divisor) * index;
      ctx.fillStyle = '#64748b';
      ctx.font = '12px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(s.month || '', x, height - 10);
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('analytics.html')) {
    AnalyticsPage.init();
  }
});
