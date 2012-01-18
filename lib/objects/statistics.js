var Statistics = module.exports = (function () {
  function Statistics (stats) {
    if (stats) {
      this.total = stats.TotalResults ? stats.TotalResults : stats.Results.length;

      if (stats.Stale) {
        this.stale = stats.Stale;
      }

      if (stats.SkippedResults) {
        this.skipped = stats.SkippedResults;
      }

      if (stats.IndexName) {
        this.index = stats.IndexName;
      }

      if (stats.IndexTimestamp) {
        this.timestamp = stats.IndexTimestamp;
      }
    }
  }

  return Statistics;
})();
