(function attachJumpLogic(global) {
  function createJumpController(config) {
    const {
      appState,
      elements,
      syncView,
      getDefaultFocusNodeId,
      setDiagramZoom,
      centerDiagramOnNode,
    } = config;

    function alignResultRowToViewportTop(gap = 6) {
      const resultRowAnchor =
        elements.diagramWrap?.closest(".result-card") || document.querySelector(".main-grid .result-card");
      if (!resultRowAnchor) return;

      const targetTop = Math.max(0, Math.round(window.scrollY + resultRowAnchor.getBoundingClientRect().top - gap));
      window.scrollTo({ top: targetTop, behavior: "auto" });
    }

    function centerInsideScrollable(container, target, fallbackToTop = true) {
      if (!container || !target) {
        if (fallbackToTop && container) container.scrollTo({ top: 0, behavior: "auto" });
        return;
      }
      const nextTop = Math.max(
        0,
        target.offsetTop - container.clientHeight / 2 + target.clientHeight / 2
      );
      container.scrollTo({ top: nextTop, behavior: "auto" });
    }

    function centerAcrossResultPanels(nodeId, shouldZoomDiagram) {
      if (!nodeId) {
        elements.parsedFeed.scrollTo({ top: 0, behavior: "auto" });
        elements.tableWrap?.scrollTo({ top: 0, behavior: "auto" });
        return;
      }

      if (shouldZoomDiagram) {
        setDiagramZoom(true);
      }

      window.requestAnimationFrame(() => centerDiagramOnNode(nodeId));
      window.setTimeout(() => centerDiagramOnNode(nodeId), 200);
      window.setTimeout(() => centerDiagramOnNode(nodeId), 420);
      window.setTimeout(() => centerDiagramOnNode(nodeId), 680);

      window.requestAnimationFrame(() => {
        const parsedTarget = elements.parsedFeed.querySelector(`[data-node-id="${nodeId}"]`);
        centerInsideScrollable(elements.parsedFeed, parsedTarget, true);

        const tableTarget = elements.statusTableBody.querySelector(`[data-node-id="${nodeId}"]`);
        centerInsideScrollable(elements.tableWrap, tableTarget, true);

        // 防止内部滚动导致浏览器主窗口再被带偏，末尾硬对齐一次
        alignResultRowToViewportTop(1);
      });
    }

    function selectStationAndCenter(stationId, preferredNodeId) {
      const station = appState.stations.find((item) => item.id === stationId);
      if (!station) return;
      appState.selectedStationId = station.id;
      appState.focusedNodeId = preferredNodeId ?? getDefaultFocusNodeId(station);
      syncView();
      window.requestAnimationFrame(() => alignResultRowToViewportTop(1));
      centerAcrossResultPanels(appState.focusedNodeId, true);
    }

    function executeSearchStyleJump(stationId, preferredNodeId) {
      selectStationAndCenter(stationId, preferredNodeId);
    }

    function focusNodeFromTimeline(stationId, nodeId) {
      appState.tableFilter = "all";
      if (elements.tableFilter) {
        elements.tableFilter.value = "all";
      }
      executeSearchStyleJump(stationId, nodeId);
    }

    return {
      centerAcrossResultPanels,
      selectStationAndCenter,
      executeSearchStyleJump,
      focusNodeFromTimeline,
    };
  }

  global.createJumpController = createJumpController;
})(window);
