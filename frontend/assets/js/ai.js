/* AI Insights Page Controller */

const AIInsightsPage = {
  async init() {
    try {
      const data = await API.getAIInsights();
      this.renderSummaryCard(data);
      this.renderRecommendations(data.recommendations);
      this.renderAlerts(data.alerts);
    } catch (e) {
      console.error(e);
      Utils.showToast('Failed to load AI Insights', 'danger');
    }
  },

  renderSummaryCard(data) {
    const summaryText = document.getElementById('aiSummaryText');
    const healthScoreVal = document.getElementById('aiHealthScoreVal');

    if (summaryText) summaryText.textContent = data.financialSummary;
    if (healthScoreVal) healthScoreVal.textContent = `${data.healthScore}/100`;
  },

  renderRecommendations(recs) {
    const container = document.getElementById('aiRecommendationsList');
    if (!container) return;

    container.innerHTML = recs.map(r => `
      <div class="card" style="margin-bottom: 1rem;">
        <div style="display: flex; align-items: flex-start; gap: 1rem;">
          <div class="card-icon-box card-icon-primary" style="flex-shrink: 0;">
            <i class="fa-solid fa-lightbulb"></i>
          </div>
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <h4 style="font-size: 1.05rem; margin-bottom: 0.25rem;">${r.title}</h4>
              <span class="status-badge status-completed">${r.impact} Impact</span>
            </div>
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.75rem;">${r.description}</p>
            <button class="btn btn-outline btn-sm" onclick="Utils.showToast('Recommendation applied to budget target!', 'success')">
              <i class="fa-solid fa-check"></i> Apply Recommendation
            </button>
          </div>
        </div>
      </div>
    `).join('');
  },

  renderAlerts(alerts) {
    const container = document.getElementById('aiAlertsList');
    if (!container) return;

    container.innerHTML = alerts.map(a => `
      <div class="card" style="margin-bottom: 1rem; border-left: 4px solid var(--warning);">
        <div style="display: flex; align-items: center; gap: 1rem;">
          <div class="card-icon-box card-icon-warning">
            <i class="fa-solid fa-triangle-exclamation"></i>
          </div>
          <div>
            <h4 style="font-size: 1rem; font-weight: 700;">${a.title}</h4>
            <p style="font-size: 0.875rem; color: var(--text-secondary);">${a.message}</p>
          </div>
        </div>
      </div>
    `).join('');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('ai-insights.html')) {
    AIInsightsPage.init();
  }
});
