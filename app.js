/* 草药谱 · 交互
 * 纯原生 JavaScript，无构建、无依赖。
 * 数据来自 window.HERBS 与 window.PAIRS（data/herbs.js）。
 */
(function () {
  "use strict";

  /* =========================================================
     基础常量
     ========================================================= */

  var HERBS = Array.isArray(window.HERBS) ? window.HERBS.slice() : [];
  var PAIRS = Array.isArray(window.PAIRS) ? window.PAIRS.slice() : [];
  var PAGE_SIZE = 15;
  var BASE_TITLE = document.title;

  var EFFICACY_META = [
    { tag: "补气", hint: "气短 · 乏力" },
    { tag: "补血", hint: "面白 · 眩晕" },
    { tag: "清热", hint: "发热 · 烦渴" },
    { tag: "解毒", hint: "疮毒 · 喉痛" },
    { tag: "活血", hint: "瘀痛 · 经闭" },
    { tag: "止血", hint: "出血 · 瘀伤" },
    { tag: "安神", hint: "心悸 · 失眠" },
    { tag: "解表", hint: "恶寒 · 无汗" },
    { tag: "化痰", hint: "痰多 · 胸闷" },
    { tag: "止咳", hint: "咳嗽 · 气喘" },
    { tag: "消食", hint: "食积 · 腹胀" },
    { tag: "利水", hint: "水肿 · 尿少" },
    { tag: "温里", hint: "畏寒 · 肢冷" },
    { tag: "收涩", hint: "自汗 · 久泻" },
    { tag: "催情", hint: "叙事母题" }
  ];

  var EFFICACY_TAGS = EFFICACY_META.map(function (item) { return item.tag; });

  var MERIDIANS = [
    "心", "肝", "脾", "肺", "肾", "胃",
    "胆", "大肠", "小肠", "膀胱", "三焦", "心包"
  ];

  var PART_ORDER = ["根", "根茎", "块茎", "茎", "叶", "花", "果实", "种子", "皮", "全草", "菌核", "鳞茎", "矿物", "动物"];

  var CONTRA_ORDER = [
    "孕妇慎用", "孕妇禁用", "哺乳期慎用", "阴虚慎用", "实热慎用",
    "脾胃虚寒", "湿盛", "表虚", "配伍禁忌", "有毒需炮制"
  ];

  var CONTRA_LABEL = {
    "孕妇慎用": "孕妇慎用",
    "孕妇禁用": "孕妇禁用",
    "哺乳期慎用": "哺乳期慎用",
    "阴虚慎用": "阴虚慎用",
    "实热慎用": "实热慎用",
    "脾胃虚寒": "脾胃虚寒",
    "湿盛": "湿盛",
    "表虚": "表虚",
    "配伍禁忌": "配伍禁忌",
    "有毒需炮制": "有毒·需炮制"
  };

  var FILTER_GROUP_LABEL = {
    qi: "四气",
    flavor: "五味",
    meridian: "归经",
    efficacy: "功效",
    part: "部位",
    contra: "禁忌"
  };

  /* =========================================================
     DOM
     ========================================================= */

  var els = {
    body: document.body,
    navCount: document.getElementById("navCount"),
    statHerbs: document.getElementById("statHerbs"),
    statPairs: document.getElementById("statPairs"),
    reverseGrid: document.getElementById("reverseGrid"),
    reverseSummary: document.getElementById("reverseSummary"),
    clearReverse: document.getElementById("clearReverse"),
    searchInput: document.getElementById("searchInput"),
    searchClear: document.getElementById("searchClear"),
    filterBar: document.getElementById("filterBar"),
    activeFilters: document.getElementById("activeFilters"),
    resetFilters: document.getElementById("resetFilters"),
    resultMeta: document.getElementById("resultMeta"),
    reverseBanner: document.getElementById("reverseBanner"),
    herbGrid: document.getElementById("herbGrid"),
    emptyState: document.getElementById("emptyState"),
    emptyReset: document.getElementById("emptyReset"),
    pagination: document.getElementById("pagination"),
    pairsList: document.getElementById("pairsList"),
    randomBtn: document.getElementById("randomBtn"),
    drawerRoot: document.getElementById("drawerRoot"),
    drawer: document.getElementById("drawer"),
    drawerContent: document.getElementById("drawerContent"),
    drawerIndex: document.getElementById("drawerIndex"),
    closeDrawer: document.getElementById("closeDrawer"),
    printBtn: document.getElementById("printBtn"),
    printSheet: document.getElementById("printSheet"),
    toast: document.getElementById("toast")
  };

  var state = {
    query: "",
    page: 1,
    reverse: null,
    filters: {
      qi: new Set(),
      flavor: new Set(),
      meridian: new Set(),
      efficacy: new Set(),
      part: new Set(),
      contra: new Set()
    }
  };

  var herbMap = {};
  HERBS.forEach(function (herb, index) {
    herb._index = index;
    herbMap[herb.id] = herb;
  });

  var drawerOpen = false;
  var activeHerbId = null;
  var lastFocused = null;
  var toastTimer = null;

  /* =========================================================
     工具函数
     ========================================================= */

  function escapeHTML(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(value) {
    return escapeHTML(value);
  }

  function fold(value) {
    return String(value == null ? "" : value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "");
  }

  function unique(list) {
    return Array.from(new Set(list));
  }

  function formatNumber(n) {
    return String(n).padStart(2, "0");
  }

  function partGroup(herb) {
    if (herb.id === "fuling") return "菌核";
    if (herb.id === "chuanbeimu") return "鳞茎";
    var part = String(herb.part || "");
    if (part.indexOf("根茎") !== -1) return "根茎";
    if (part.indexOf("块茎") !== -1) return "块茎";
    if (part.indexOf("根") !== -1) return "根";
    if (part.indexOf("全草") !== -1) return "全草";
    if (part.indexOf("茎") !== -1) return "茎";
    if (part.indexOf("叶") !== -1) return "叶";
    if (part.indexOf("花") !== -1) return "花";
    if (part.indexOf("果实") !== -1) return "果实";
    if (part.indexOf("种子") !== -1) return "种子";
    if (part.indexOf("皮") !== -1) return "皮";
    return part || "其他";
  }

  var SOURCE_OVERRIDES = {
    ejiao: "动物药",
    fuling: "菌类",
    zhuling: "菌类"
  };

  function sourceLabel(herb) {
    if (herb.sourceTag) return herb.sourceTag;
    if (SOURCE_OVERRIDES[herb.id]) return SOURCE_OVERRIDES[herb.id];
    if (herb.part === "矿物") return "矿物药";
    if (herb.part === "动物") return "动物药";
    if (herb.part === "菌核") return "菌类";
    return "";
  }

  function allPartGroups() {
    var present = HERBS.map(partGroup);
    return PART_ORDER.filter(function (part) {
      return present.indexOf(part) !== -1;
    });
  }

  function presentContraTags() {
    var tags = [];
    HERBS.forEach(function (herb) {
      (herb.contraTags || []).forEach(function (tag) { tags.push(tag); });
    });
    tags = unique(tags);
    return CONTRA_ORDER.filter(function (tag) { return tags.indexOf(tag) !== -1; });
  }

  function currentFiltersCount() {
    return Object.keys(state.filters).reduce(function (sum, key) {
      return sum + state.filters[key].size;
    }, 0);
  }

  function hasAnyCondition() {
    return Boolean(state.query) || Boolean(state.reverse) || currentFiltersCount() > 0;
  }

  function setPage(next) {
    state.page = Math.max(1, Number(next) || 1);
  }

  function showToast(message) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      els.toast.classList.remove("is-visible");
    }, 2300);
  }

  /* =========================================================
     匹配逻辑
     ========================================================= */

  function matchesQuery(herb) {
    if (!state.query) return true;
    var q = fold(state.query);
    if (!q) return true;
    var haystack = [
      herb.name, herb.en, herb.latin, herb.pinyin,
      (herb.aliases || []).join(" ")
    ].map(fold).join("|");
    return haystack.indexOf(q) !== -1;
  }

  function matchesSet(values, selected) {
    if (!selected.size) return true;
    return Array.from(selected).some(function (value) {
      return values.indexOf(value) !== -1;
    });
  }

  function matchesEfficacy(herb, selected) {
    if (!selected.size) return true;
    var values = (herb.efficacy || []).concat(herb.narrativeTags || []);
    return Array.from(selected).some(function (tag) {
      return values.indexOf(tag) !== -1;
    });
  }

  function matchesReverse(herb) {
    if (!state.reverse) return true;
    if (state.reverse === "催情") {
      return (herb.narrativeTags || []).indexOf("催情") !== -1;
    }
    return (herb.efficacy || []).indexOf(state.reverse) !== -1;
  }

  function matchesFilters(herb) {
    if (!matchesSet([herb.qi], state.filters.qi)) return false;
    if (!matchesSet(herb.flavorTags || [], state.filters.flavor)) return false;
    if (!matchesSet(herb.meridians || [], state.filters.meridian)) return false;
    if (!matchesEfficacy(herb, state.filters.efficacy)) return false;
    if (!matchesSet([partGroup(herb)], state.filters.part)) return false;
    if (!matchesSet(herb.contraTags || [], state.filters.contra)) return false;
    return true;
  }

  function filteredHerbs() {
    return HERBS.filter(function (herb) {
      return matchesQuery(herb) && matchesFilters(herb) && matchesReverse(herb);
    });
  }

  /* =========================================================
     证候索引
     ========================================================= */

  function renderReverseGrid() {
    if (!els.reverseGrid) return;
    els.reverseGrid.innerHTML = EFFICACY_META.map(function (item, index) {
      return [
        '<button class="drawer-chip" type="button" data-tag="', escapeAttr(item.tag),
        '" aria-pressed="false">',
        '<span class="chip-index">', formatNumber(index + 1), "</span>",
        '<span class="chip-label">', escapeHTML(item.tag), "</span>",
        '<span class="chip-hint">', escapeHTML(item.hint), "</span>",
        "</button>"
      ].join("");
    }).join("");
  }

  function updateReverseUI() {
    var buttons = els.reverseGrid ? els.reverseGrid.querySelectorAll(".drawer-chip") : [];
    Array.prototype.forEach.call(buttons, function (button) {
      var active = button.getAttribute("data-tag") === state.reverse;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });

    if (!els.reverseSummary) return;

    if (!state.reverse) {
      els.reverseSummary.textContent = "先选一种功效或症状，再往下看药材。";
      if (els.clearReverse) els.clearReverse.hidden = true;
      return;
    }

    var count = HERBS.filter(function (herb) {
      return matchesReverse(herb);
    }).length;

    if (state.reverse === "催情") {
      els.reverseSummary.textContent = "「催情」是叙事母题，不是已证实的临床功效。当前仅以文化联想立目，共 " + count + " 味；切勿据此用药。";
    } else {
      els.reverseSummary.textContent = "已拉开「" + state.reverse + "」抽屉，共 " + count + " 味。结果卡片会直接列出部位、性味与禁忌。";
    }

    if (els.clearReverse) els.clearReverse.hidden = false;
  }

  /* =========================================================
     筛选器
     ========================================================= */

  function filterPanelDefinitions() {
    return [
      {
        id: "nature",
        label: "性味",
        sections: [
          { key: "qi", label: "四气", options: ["寒", "凉", "平", "温", "热"] },
          { key: "flavor", label: "五味", options: ["辛", "甘", "酸", "苦", "咸"] }
        ]
      },
      {
        id: "meridian",
        label: "归经",
        sections: [
          { key: "meridian", label: "十二归经", options: MERIDIANS }
        ]
      },
      {
        id: "efficacy",
        label: "功效",
        sections: [
          { key: "efficacy", label: "功效 / 症状", options: EFFICACY_TAGS }
        ]
      },
      {
        id: "part",
        label: "部位",
        sections: [
          { key: "part", label: "药用部位", options: allPartGroups() }
        ]
      },
      {
        id: "contra",
        label: "禁忌",
        sections: [
          { key: "contra", label: "禁忌提示", options: presentContraTags() }
        ]
      }
    ];
  }

  function optionLabel(key, value) {
    if (key === "efficacy" && value === "催情") return "催情 · 叙事";
    if (key === "contra" && CONTRA_LABEL[value]) return CONTRA_LABEL[value];
    return value;
  }

  function renderFilters() {
    if (!els.filterBar) return;
    var panels = filterPanelDefinitions();

    els.filterBar.innerHTML = panels.map(function (panel) {
      var total = panel.sections.reduce(function (sum, section) {
        return sum + state.filters[section.key].size;
      }, 0);

      var sections = panel.sections.map(function (section) {
        var options = section.options.map(function (value, index) {
          var inputId = "flt-" + section.key + "-" + index;
          var checked = state.filters[section.key].has(value) ? " checked" : "";
          return [
            '<label class="filter-option" for="', inputId, '">',
            '<input id="', inputId, '" type="checkbox" data-group="', escapeAttr(section.key),
            '" value="', escapeAttr(value), '"', checked, ">",
            "<span>", escapeHTML(optionLabel(section.key, value)), "</span>",
            "</label>"
          ].join("");
        }).join("");

        return [
          '<p class="filter-panel-title">', escapeHTML(section.label), "</p>",
          '<div class="filter-options">', options, "</div>"
        ].join("");
      }).join("");

      return [
        '<details class="filter-group', total ? " has-selection" : "", '" data-panel="', panel.id, '">',
        "<summary>",
        "<span>", escapeHTML(panel.label), "</span>",
        '<span class="filter-count" aria-hidden="true">', total || "0", "</span>",
        '<span class="filter-chevron" aria-hidden="true"></span>',
        "</summary>",
        '<div class="filter-panel">', sections, "</div>",
        "</details>"
      ].join("");
    }).join("");

    Array.prototype.forEach.call(els.filterBar.querySelectorAll("details"), function (details) {
      details.addEventListener("toggle", function () {
        if (!details.open) return;
        Array.prototype.forEach.call(els.filterBar.querySelectorAll("details"), function (other) {
          if (other !== details) other.open = false;
        });
      });
    });
  }

  function updateFilterUI() {
    if (!els.filterBar) return;

    Array.prototype.forEach.call(els.filterBar.querySelectorAll(".filter-group"), function (group) {
      var count = 0;
      Array.prototype.forEach.call(group.querySelectorAll("input[type=checkbox]"), function (input) {
        var key = input.getAttribute("data-group");
        var value = input.value;
        input.checked = state.filters[key].has(value);
        if (input.checked) count += 1;
      });
      var badge = group.querySelector(".filter-count");
      if (badge) badge.textContent = String(count);
      group.classList.toggle("has-selection", count > 0);
    });

    if (els.resetFilters) {
      els.resetFilters.hidden = !(hasAnyCondition());
    }
  }

  function renderActiveFilters() {
    if (!els.activeFilters) return;
    var chips = [];

    Object.keys(state.filters).forEach(function (key) {
      Array.from(state.filters[key]).forEach(function (value) {
        chips.push([
          '<button class="active-chip" type="button" data-remove-group="', key,
          '" data-remove-value="', escapeAttr(value), '" aria-label="移除筛选 ',
          escapeAttr(FILTER_GROUP_LABEL[key] + " " + value), '">',
          "<span>", escapeHTML(FILTER_GROUP_LABEL[key] + " · " + value), "</span>",
          '<span class="chip-x" aria-hidden="true">×</span>',
          "</button>"
        ].join(""));
      });
    });

    els.activeFilters.innerHTML = chips.join("");
  }

  function addFilter(key, value) {
    state.filters[key].add(value);
    state.page = 1;
  }

  function removeFilter(key, value) {
    state.filters[key].delete(value);
    state.page = 1;
  }

  function clearFilters() {
    Object.keys(state.filters).forEach(function (key) { state.filters[key].clear(); });
    state.page = 1;
  }

  function resetEverything() {
    clearFilters();
    state.query = "";
    state.reverse = null;
    if (els.searchInput) els.searchInput.value = "";
    if (els.searchClear) els.searchClear.hidden = true;
    renderAll();
  }

  /* =========================================================
     卡片与结果
     ========================================================= */

  function cardHTML(herb) {
    var toxicity = String(herb.toxicity || "无毒");
    var isToxic = toxicity !== "无毒";
    var primary = (herb.efficacy && herb.efficacy[0]) || "本草";
    var familyShort = String(herb.family || "").split("·")[0].trim();
    var meridianText = (herb.meridians || []).slice(0, 3).join("") + ((herb.meridians || []).length > 3 ? "…" : "");
    var flavorText = (herb.flavors || []).join("、");
    var contraindicationClass = isToxic ? " is-warning" : "";

    var facts = state.reverse ? [
      '<div class="reverse-facts" aria-label="反查详情">',
      '<div class="fact-row"><dt>部位</dt><dd>', escapeHTML(herb.part), "</dd></div>",
      '<div class="fact-row"><dt>性味</dt><dd>', escapeHTML(flavorText + " · " + herb.nature), "</dd></div>",
      '<div class="fact-row"><dt>禁忌</dt><dd class="', contraindicationClass.trim(), '">', escapeHTML(herb.contraBrief || "资料待核"), "</dd></div>",
      "</div>"
    ].join("") : "";

    return [
      '<article class="herb-card" role="button" tabindex="0" data-id="', escapeAttr(herb.id),
      '" aria-haspopup="dialog" aria-label="查看', escapeAttr(herb.name), '详情">',
      '<div class="card-top">',
      '<span class="card-no">NO. ', formatNumber(herb._index + 1), "</span>",
      '<span class="card-top-right">',
      sourceLabel(herb) ? '<span class="card-source">' + escapeHTML(sourceLabel(herb)) + "</span>" : "",
      '<span class="card-family">', escapeHTML(familyShort), "</span>",
      isToxic ? '<span class="card-tox">' + escapeHTML(toxicity) + "</span>" : "",
      "</span>",
      "</div>",
      '<div class="card-center">',
      '<div class="card-rule" aria-hidden="true"></div>',
      '<h3 class="card-name">', escapeHTML(herb.name), "</h3>",
      '<p class="card-en">', escapeHTML(herb.en), "</p>",
      '<p class="card-latin">', escapeHTML(herb.latin), "</p>",
      "</div>",
      facts,
      '<div class="card-foot">',
      '<div class="card-meta">',
      "<span>", escapeHTML(herb.part + " · " + herb.nature), "</span>",
      "<span>", escapeHTML(flavorText + " · " + meridianText), "</span>",
      "</div>",
      '<span class="seal" aria-label="功效印：', escapeAttr(primary), '">', escapeHTML(primary), "</span>",
      "</div>",
      "</article>"
    ].join("");
  }

  function renderResults() {
    if (!els.herbGrid) return;

    var matches = filteredHerbs();
    var totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
    if (state.page > totalPages) state.page = totalPages;

    var start = (state.page - 1) * PAGE_SIZE;
    var pageItems = matches.slice(start, start + PAGE_SIZE);

    els.herbGrid.classList.toggle("reverse-lookup", Boolean(state.reverse));
    els.herbGrid.innerHTML = pageItems.map(cardHTML).join("");

    if (els.emptyState) {
      els.emptyState.hidden = matches.length !== 0;
    }

    if (els.resultMeta) {
      if (matches.length === 0) {
        els.resultMeta.textContent = "共 0 味";
      } else {
        els.resultMeta.textContent = "共 " + matches.length + " 味 · 第 " + state.page + " / " + totalPages + " 页";
      }
    }

    renderPagination(matches.length, totalPages);
    renderReverseBanner(matches.length);
  }

  function renderPagination(total, totalPages) {
    if (!els.pagination) return;

    if (total === 0 || totalPages <= 1) {
      els.pagination.hidden = true;
      els.pagination.innerHTML = "";
      return;
    }

    els.pagination.hidden = false;
    var pageButtons = [];
    for (var i = 1; i <= totalPages; i += 1) {
      pageButtons.push([
        '<button class="page-btn', i === state.page ? " is-current" : "",
        '" type="button" data-page="', i, '" aria-label="第 ', i, ' 页"',
        i === state.page ? ' aria-current="page"' : "", ">", i, "</button>"
      ].join(""));
    }

    els.pagination.innerHTML = [
      '<button class="page-btn page-arrow" type="button" data-page="', state.page - 1, '"',
      state.page <= 1 ? " disabled" : "", ' aria-label="上一页"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>',
      '<div class="page-list">', pageButtons.join(""), "</div>",
      '<p class="page-summary">共 ', total, " 条 · 每页 ", PAGE_SIZE, "</p>",
      '<button class="page-btn page-arrow" type="button" data-page="', state.page + 1, '"',
      state.page >= totalPages ? " disabled" : "", ' aria-label="下一页"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'
    ].join("");
  }

  function renderReverseBanner(count) {
    if (!els.reverseBanner) return;

    if (!state.reverse) {
      els.reverseBanner.hidden = true;
      els.reverseBanner.innerHTML = "";
      return;
    }

    var note = state.reverse === "催情"
      ? "仅以文化联想与叙事母题立目，不代表催情功效，也不提供任何用法。"
      : "下列药材已按「" + state.reverse + "」筛出；每张卡片直接显示部位、性味与禁忌。";

    els.reverseBanner.hidden = false;
    els.reverseBanner.innerHTML = [
      '<div class="reverse-banner-main">',
      '<strong>反查 · ', escapeHTML(state.reverse), "</strong>",
      "<p>", escapeHTML(note), " 当前 ", count, " 味。</p>",
      "</div>",
      '<button class="text-link" type="button" data-clear-reverse>清除反查 ×</button>'
    ].join("");
  }

  function renderAll() {
    updateReverseUI();
    updateFilterUI();
    renderActiveFilters();
    renderResults();
    updateHeroStats();
    if (els.searchClear) els.searchClear.hidden = !state.query;
  }

  function updateHeroStats() {
    if (els.navCount) els.navCount.textContent = String(HERBS.length);
    if (els.statHerbs) els.statHerbs.textContent = String(HERBS.length);
    if (els.statPairs) els.statPairs.textContent = String(PAIRS.length);
  }

  /* =========================================================
     药对
     ========================================================= */

  function pairHerbHTML(herb) {
    if (!herb) return "";
    return [
      '<button class="pair-herb" type="button" data-herb-id="', escapeAttr(herb.id),
      '" aria-label="查看', escapeAttr(herb.name), '详情">',
      escapeHTML(herb.name),
      '<span class="pair-en">', escapeHTML(herb.en), "</span>",
      "</button>"
    ].join("");
  }

  function renderPairs() {
    if (!els.pairsList) return;

    var validPairs = PAIRS.filter(function (pair) {
      return herbMap[pair.a] && herbMap[pair.b];
    });

    els.pairsList.innerHTML = validPairs.map(function (pair, index) {
      var herbA = herbMap[pair.a];
      var herbB = herbMap[pair.b];
      return [
        '<article class="pair-item">',
        '<span class="pair-no">PAIR ', formatNumber(index + 1), "</span>",
        '<div class="pair-body">',
        '<div class="pair-names">',
        pairHerbHTML(herbA),
        '<span class="pair-plus" aria-hidden="true">+</span>',
        pairHerbHTML(herbB),
        "</div>",
        '<p class="pair-note">', escapeHTML(pair.note), "</p>",
        "</div>",
        "</article>"
      ].join("");
    }).join("");

    updateHeroStats();
  }

  /* =========================================================
     药用示意 SVG
     ========================================================= */

  function specimenDrawing(herb) {
    var spec = herb.specimen || { type: "slice", variant: 1 };
    var type = spec.type || "slice";
    var variant = Number(spec.variant || 1);
    var shift = ((variant % 3) - 1) * 10;

    if (type === "shell") {
      return [
        '<g transform="translate(0,0)">',
        '<g transform="translate(276,137) rotate(-10)">',
        '<path d="M-86 6 C -84 -42, -36 -72, 10 -64 C 57 -56, 89 -21, 82 22 C 74 61, 30 77, -9 67 C -51 57, -88 34, -86 6Z" fill="#F6F0E6" stroke-width="1.8"/>',
        '<path d="M-62 4 C -58 -31, -23 -52, 14 -46 C 48 -40, 69 -16, 64 14 C 58 41, 27 53, -3 45 C -34 38, -65 22, -62 4Z" stroke-width=".9" opacity=".7"/>',
        '<path d="M-40 0 C -37 -23, -13 -36, 12 -31 C 34 -27, 47 -11, 43 8 C 38 27, 18 34, -2 28" stroke-width=".7" opacity=".6"/>',
        '<path d="M-86 6 C -58 20, -28 27, 6 25 M-83 26 C -52 41, -21 48, 11 44" stroke-width=".65" opacity=".65"/>',
        '<path d="M-61 -58 C -49 -44, -41 -27, -39 -8" stroke-width="1"/>',
        '<path d="M82 22 C 96 25, 107 32, 115 43" stroke-width=".9"/>',
        '<circle cx="-25" cy="9" r="2.3" fill="#A0432B" stroke="none"/>',
        "</g>",
        '<g transform="translate(472,185) rotate(16)">',
        '<path d="M-37 7 C -35 -16, -13 -30, 9 -25 C 31 -20, 42 -3, 37 15 C 31 32, 11 39, -8 33 C -27 27, -39 19, -37 7Z" fill="#F6F0E6" stroke-width="1.2"/>',
        '<path d="M-26 4 C -22 -11, -7 -18, 8 -14 C 22 -10, 28 0, 25 11" stroke-width=".7"/>',
        "</g>",
        "</g>"
      ].join("");
    }

    if (type === "cicada") {
      return [
        '<g transform="translate(320,136) rotate(-8)">',
        '<path d="M-12 -58 C 4 -69, 24 -64, 27 -48 C 30 -31, 20 -13, 4 -7 C -12 -1, -27 -9, -30 -26 C -33 -41, -25 -52, -12 -58Z" fill="#F6F0E6" stroke-width="1.5"/>',
        '<path d="M-13 -54 C -3 -48, 10 -45, 24 -48" stroke-width=".8"/>',
        '<path d="M-11 -35 C -2 -29, 10 -27, 22 -31" stroke-width=".7" opacity=".7"/>',
        '<path d="M-12 -17 C -2 -13, 6 -13, 11 -17" stroke-width=".7"/>',
        '<path d="M-7 8 C -7 35, 4 58, 13 70 M8 8 C 11 34, 20 52, 31 63" stroke-width="1.1"/>',
        '<path d="M-29 -30 C -47 -39, -58 -52, -63 -68 M23 -31 C 40 -41, 50 -54, 55 -69" stroke-width="1.1"/>',
        '<path d="M-66 -70 C -56 -61, -49 -52, -44 -42 M58 -71 C 49 -61, 42 -52, 38 -43" stroke-width=".8"/>',
        '<path d="M-25 -12 C -40 4, -45 27, -40 45 M31 -13 C 45 4, 48 27, 43 44" stroke-width=".8" opacity=".75"/>',
        '<path d="M-8 8 L 0 27 L 9 8" stroke-width=".8"/>',
        "</g>",
        '<path d="M144 224 C 241 214, 363 216, 508 225" stroke-width=".8" opacity=".55"/>'
      ].join("");
    }

    if (type === "worm") {
      return [
        '<g transform="translate(0,0)">',
        '<path d="M142 186 C 205 145, 239 91, 319 84 C 390 78, 438 116, 506 103" stroke-width="15" fill="none" stroke="#F6F0E6"/>',
        '<path d="M142 186 C 205 145, 239 91, 319 84 C 390 78, 438 116, 506 103" stroke-width="1.5" fill="none" stroke="#211C17"/>',
        '<path d="M159 175 C 216 138, 252 94, 322 93 C 383 92, 423 122, 492 111" stroke-width=".85" opacity=".7"/>',
        '<path d="M230 119 C 242 127, 257 130, 271 126 M293 93 C 306 101, 322 104, 336 100 M354 92 C 368 99, 383 102, 397 98 M420 105 C 434 112, 450 113, 464 109" stroke-width=".7" opacity=".65"/>',
        '<path d="M319 84 C 320 68, 327 55, 338 46 M326 58 C 337 54, 346 55, 354 60 M320 84 C 309 70, 298 63, 286 60" stroke-width="1"/>',
        '<path d="M506 103 C 516 99, 525 99, 533 102" stroke-width="1.2"/>',
        '<circle cx="319" cy="84" r="2.2" fill="#A0432B" stroke="none"/>',
        "</g>",
        '<path d="M120 225 C 233 216, 370 218, 526 226" stroke-width=".8" opacity=".5"/>'
      ].join("");
    }

    if (type === "antler") {
      return [
        '<g transform="translate(320,218)">',
        '<path d="M0 0 C -5 -36, -2 -68, 6 -98" stroke-width="5"/>',
        '<path d="M6 -98 C 3 -127, -8 -151, -28 -170" stroke-width="3.6"/>',
        '<path d="M-12 -126 C -35 -131, -55 -143, -66 -160" stroke-width="2.8"/>',
        '<path d="M-27 -170 C -41 -180, -49 -195, -48 -209" stroke-width="2.4"/>',
        '<path d="M-62 -157 C -78 -167, -87 -181, -89 -196" stroke-width="2.2"/>',
        '<path d="M0 -20 C 19 -35, 29 -55, 31 -77" stroke-width="2.4"/>',
        '<path d="M31 -77 C 33 -98, 25 -119, 12 -135" stroke-width="2"/>',
        '<path d="M10 -57 C 25 -65, 35 -78, 39 -94" stroke-width="1.8"/>',
        '<path d="M-18 -148 C -26 -155, -30 -165, -29 -176 M-49 -188 C -55 -194, -57 -202, -55 -210 M-82 -184 C -88 -190, -90 -198, -89 -206" stroke-width="1.1"/>',
        '<path d="M2 -18 C -6 -16, -12 -12, -15 -6 M2 -18 C 10 -16, 16 -12, 19 -6" stroke-width="1"/>',
        '<path d="M3 -42 C -6 -40, -13 -36, -17 -30 M3 -42 C 12 -40, 19 -36, 23 -30 M5 -66 C -3 -64, -9 -60, -12 -54 M5 -66 C 13 -64, 19 -60, 22 -54" stroke-width=".9" opacity=".7"/>',
        '<ellipse cx="0" cy="0" rx="8" ry="3" fill="#F6F0E6" stroke-width="1.1"/>',
        '<path d="M0 0 C -24 -8, -38 -18, -44 -30 M0 0 C 24 -8, 38 -18, 44 -30" stroke-width=".8" opacity=".6"/>',
        "</g>",
        '<g transform="translate(490,193) rotate(13)">',
        '<path d="M0 0 C 13 -14, 33 -19, 49 -12 C 41 2, 22 10, 0 0Z" fill="#F6F0E6" stroke-width="1.1"/>',
        '<path d="M0 0 C 5 13, 7 26, 5 37" stroke-width=".8"/>',
        "</g>",
        '<path d="M118 231 C 222 223, 363 225, 520 232" stroke-width=".8" opacity=".5"/>'
      ].join("");
    }

    if (type === "powder") {
      return [
        '<g transform="translate(320,146)">',
        '<path d="M-92 14 C -61 -17, -27 -31, 9 -29 C 50 -28, 84 -10, 98 16 C 61 38, 16 45, -30 39 C -62 35, -81 28, -92 14Z" fill="#F6F0E6" stroke-width="1.4"/>',
        '<path d="M-78 19 C -41 -3, 3 -11, 43 -8 C 74 -6, 87 6, 78 22 C 49 40, 1 45, -37 36" stroke-width=".75" opacity=".65"/>',
        '<circle cx="-47" cy="-2" r="4" stroke-width=".8"/><circle cx="-12" cy="-12" r="3" stroke-width=".8"/><circle cx="25" cy="-8" r="4" stroke-width=".8"/><circle cx="61" cy="2" r="3" stroke-width=".8"/>',
        '<circle cx="-30" cy="12" r="2.4" stroke-width=".7"/><circle cx="6" cy="8" r="3" stroke-width=".7"/><circle cx="42" cy="15" r="2.4" stroke-width=".7"/>',
        '<circle cx="-67" cy="22" r="1.8" fill="#A0432B" stroke="none"/><circle cx="18" cy="24" r="1.8" fill="#A0432B" stroke="none"/><circle cx="71" cy="22" r="1.8" fill="#A0432B" stroke="none"/>',
        "</g>",
        '<g transform="translate(474,197) rotate(9)">',
        '<path d="M0 0 C 12 -12, 30 -14, 43 -4 C 40 8, 24 17, 7 13 C -2 10, -4 5, 0 0Z" fill="#F6F0E6" stroke-width="1"/>',
        '<path d="M7 1 C 18 -5, 29 -5, 36 0" stroke-width=".6"/>',
        "</g>",
        '<path d="M120 230 C 218 222, 354 224, 500 232" stroke-width=".8" opacity=".5"/>'
      ].join("");
    }

    if (type === "mineral") {
      return [
        '<g transform="translate(320,136)">',
        '<path d="M-86 17 L-49 -46 L17 -57 L72 -17 L56 43 L-10 60 L-67 48Z" fill="#F6F0E6" stroke-width="1.9"/>',
        '<path d="M-49 -46 L-24 2 L17 -57 M-24 2 L-67 48 M-24 2 L56 43 M-24 2 L-10 60" stroke-width="1.05"/>',
        '<path d="M-10 60 L-2 18 L31 5 M31 5 L56 43 M31 5 L17 -57" stroke-width=".8" opacity=".7"/>',
        '<path d="M-49 -46 L-38 -16 M17 -57 L2 -20 M56 43 L16 50" stroke-width=".55" opacity=".55"/>',
        '<circle cx="-24" cy="2" r="2.3" fill="#A0432B" stroke="none"/>',
        "</g>",
        '<g transform="translate(474,157) rotate(12)">',
        '<path d="M-38 14 L-20 -23 L12 -31 L34 -8 L25 25 L-8 35Z" fill="#F6F0E6" stroke-width="1.2"/>',
        '<path d="M-20 -23 L-6 1 L12 -31 M-6 1 L25 25 M-6 1 L-8 35" stroke-width=".7"/>',
        "</g>",
        '<path d="M106 216 C 199 208, 339 210, 506 217" stroke-width=".8" opacity=".55"/>'
      ].join("");
    }

    if (type === "fiber") {
      return [
        '<g transform="translate(0,0)">',
        '<path d="M171 172 C 246 105, 333 90, 433 126 C 461 137, 481 150, 497 166" stroke-width="2.2"/>',
        '<path d="M164 154 C 236 87, 326 70, 426 106 C 455 117, 477 129, 494 144" stroke-width="1.4"/>',
        '<path d="M178 190 C 253 124, 341 108, 441 144 C 468 155, 487 168, 503 184" stroke-width="1.4"/>',
        '<path d="M156 134 C 232 68, 323 51, 426 88 C 456 99, 477 111, 494 126" stroke-width="1.1" opacity=".75"/>',
        '<path d="M186 210 C 262 145, 349 130, 449 166 C 475 176, 493 189, 509 204" stroke-width="1.1" opacity=".75"/>',
        '<path d="M170 172 C 230 129, 287 108, 345 103 M181 191 C 242 149, 303 128, 363 123" stroke-width=".55" opacity=".55"/>',
        '<g transform="translate(322,125) rotate(36)">',
        '<rect x="-8" y="-10" width="16" height="24" fill="#F6F0E6" stroke-width="1"/>',
        '<path d="M-32 -8 C -10 0, 10 0, 32 -8" stroke-width="1.1"/>',
        '<path d="M-32 12 C -10 20, 10 20, 32 12" stroke-width="1.1"/>',
        "</g>",
        '<path d="M144 184 C 153 192, 160 200, 164 209 M493 145 C 504 152, 512 160, 518 168" stroke-width=".8" opacity=".7"/>',
        "</g>",
        '<g transform="translate(492,198) rotate(8)">',
        '<ellipse cx="0" cy="0" rx="38" ry="21" fill="#F6F0E6" stroke-width="1.2"/>',
        '<path d="M-27 0 C -17 -9, 16 -10, 27 0 C 16 9, -17 9, -27 0Z" stroke-width=".7"/>',
        '<circle cx="0" cy="0" r="2" fill="#A0432B" stroke="none"/>',
        "</g>"
      ].join("");
    }

    if (type === "taproot") {
      return [
        '<g transform="translate(', 318 + shift, ',50)">',
        '<path d="M0 0 C -9 37, -5 79, 2 119 C 7 147, -4 166, -12 184" stroke-width="2.2"/>',
        '<path d="M24 5 C 19 41, 26 78, 20 114 C 15 143, 25 162, 31 179" stroke-width="1.8"/>',
        '<path d="M-22 8 C -32 46, -27 83, -36 114 C -44 144, -38 164, -46 181" stroke-width="1.6"/>',
        '<path d="M-3 29 C -23 34, -37 47, -44 64" stroke-width="1"/>',
        '<path d="M4 57 C 23 61, 36 74, 41 91" stroke-width="1"/>',
        '<path d="M0 92 C -17 100, -27 113, -31 129" stroke-width="1"/>',
        '<path d="M17 103 C 33 110, 43 123, 47 138" stroke-width="1"/>',
        '<path d="M-5 140 C -20 148, -27 161, -29 174" stroke-width=".9"/>',
        '<path d="M-20 181 C -29 190, -39 195, -51 197" stroke-width=".8"/>',
        '<path d="M27 176 C 37 185, 46 190, 57 192" stroke-width=".8"/>',
        '<path d="M-55 58 C -70 57, -80 63, -86 73" stroke-width=".8"/>',
        '<path d="M38 84 C 52 83, 63 88, 70 98" stroke-width=".8"/>',
        '<path d="M0 0 C -5 -11, -12 -19, -21 -24" stroke-width="1"/>',
        '<path d="M24 5 C 30 -5, 38 -11, 48 -14" stroke-width="1"/>',
        "</g>",
        '<g transform="translate(482,149) rotate(9)">',
        '<ellipse cx="0" cy="0" rx="44" ry="27" fill="#F6F0E6" stroke-width="1.3"/>',
        '<ellipse cx="0" cy="0" rx="31" ry="18" stroke-width=".8"/>',
        '<path d="M-22 -5 C -8 -15, 10 -14, 24 -4 M-18 7 C -4 14, 10 13, 21 6" stroke-width=".65"/>',
        '<circle cx="0" cy="0" r="2.2" fill="#A0432B" stroke="none"/>',
        "</g>",
        '<g transform="translate(476,98) rotate(-18)">',
        '<path d="M0 0 C 15 -10, 32 -9, 45 1 C 31 12, 14 12, 0 0Z" fill="#F6F0E6" stroke-width="1"/>',
        '<path d="M0 0 C -7 10, -8 21, -6 32" stroke-width=".8"/>',
        "</g>"
      ].join("");
    }

    if (type === "capsule") {
      return [
        '<g transform="translate(0,0)">',
        '<path d="M154 204 C 226 170, 301 146, 378 134 C 426 126, 468 108, 505 79" stroke-width="1.7"/>',
        '<path d="M238 167 C 220 145, 203 137, 184 139 C 200 123, 228 131, 245 151" stroke-width="1"/>',
        '<path d="M354 142 C 342 119, 350 100, 368 88 C 370 108, 380 123, 392 132" stroke-width="1"/>',
        '<g transform="translate(280,124) rotate(-14)">',
        '<path d="M-25 0 C -23 -30, 23 -30, 25 0 C 23 30, -23 30, -25 0Z" fill="#F6F0E6" stroke-width="1.5"/>',
        '<path d="M0 -30 C -3 0, -3 30, 0 30" stroke-width="1"/>',
        '<path d="M-18 5 C -10 14, 10 14, 18 5" stroke-width=".7" opacity=".7"/>',
        '<circle cx="0" cy="0" r="2" fill="#A0432B" stroke="none"/>',
        "</g>",
        '<g transform="translate(381,118) rotate(13)">',
        '<path d="M-23 0 C -21 -28, 21 -28, 23 0 C 21 28, -21 28, -23 0Z" fill="#F6F0E6" stroke-width="1.4"/>',
        '<path d="M0 -28 C -3 0, -3 28, 0 28" stroke-width=".9"/>',
        '<path d="M-17 4 C -9 13, 9 13, 17 4" stroke-width=".65" opacity=".65"/>',
        "</g>",
        '<g transform="translate(461,94) rotate(-9)">',
        '<path d="M-26 0 C -24 -31, 24 -31, 26 0 C 24 31, -24 31, -26 0Z" fill="#F6F0E6" stroke-width="1.5"/>',
        '<path d="M0 -31 C -3 0, -3 31, 0 31" stroke-width="1"/>',
        '<path d="M-21 4 C -10 14, 10 14, 21 4" stroke-width=".65" opacity=".65"/>',
        '<path d="M-14 -12 C -4 -8, 4 -8, 14 -12 M-14 12 C -4 16, 4 16, 14 12" stroke-width=".6" opacity=".55"/>',
        '<circle cx="0" cy="0" r="2" fill="#A0432B" stroke="none"/>',
        "</g>",
        "</g>"
      ].join("");
    }

    if (type === "capitulum") {
      var petals = "";
      for (var pIndex = 0; pIndex < 18; pIndex += 1) {
        var pAngle = (360 / 18) * pIndex;
        petals += '<path d="M0 -19 C -8 -27, -10 -39, -2 -51 C 7 -42, 9 -29, 3 -19Z" fill="#F6F0E6" stroke-width=".9" transform="rotate(' + pAngle + ')"/>';
      }
      return [
        '<g transform="translate(0,0)">',
        '<path d="M321 224 C 315 179, 322 130, 320 78" stroke-width="2.1"/>',
        '<path d="M318 184 C 297 172, 276 171, 258 182 C 276 196, 298 197, 318 188" fill="#F6F0E6" stroke-width="1.2"/>',
        '<path d="M322 164 C 344 150, 367 151, 384 164 C 365 178, 342 180, 322 171" fill="#F6F0E6" stroke-width="1.2"/>',
        '<path d="M320 78 C 316 66, 306 57, 292 52" stroke-width="1.2"/>',
        '<path d="M320 78 C 327 64, 340 56, 355 54" stroke-width="1.2"/>',
        '<path d="M320 142 C 286 150, 251 144, 224 128" stroke-width="1.1"/>',
        '<path d="M320 142 C 358 149, 394 142, 427 125" stroke-width="1.1"/>',
        '<g transform="translate(320,142)">',
        petals,
        '<circle cx="0" cy="0" r="19" fill="#F6F0E6" stroke-width="1.4"/>',
        '<circle cx="0" cy="0" r="12" stroke-width=".8"/>',
        '<circle cx="0" cy="0" r="3" fill="#A0432B" stroke="none"/>',
        '<path d="M-8 -7 C -4 -12, 4 -12, 8 -7 M-8 7 C -4 12, 4 12, 8 7" stroke-width=".6" opacity=".6"/>',
        "</g>",
        '<g transform="translate(212,118) rotate(-18)">',
        '<path d="M0 0 C -12 -5, -18 -17, -13 -30 C -4 -35, 8 -30, 13 -18 C 12 -7, 7 0, 0 0Z" fill="#F6F0E6" stroke-width="1"/>',
        '<path d="M-6 -28 C -2 -20, 1 -12, 2 -3 M6 -27 C 4 -18, 4 -10, 2 -3" stroke-width=".6"/>',
        '<circle cx="0" cy="-10" r="2" fill="#A0432B" stroke="none"/>',
        "</g>",
        '<g transform="translate(435,114) rotate(20)">',
        '<path d="M0 0 C -11 -5, -17 -16, -12 -27 C -3 -33, 8 -27, 12 -16 C 10 -6, 6 0, 0 0Z" fill="#F6F0E6" stroke-width="1"/>',
        '<path d="M-5 -25 C -2 -17, 0 -10, 1 -3 M6 -24 C 4 -16, 3 -9, 2 -3" stroke-width=".6"/>',
        '<circle cx="0" cy="-9" r="1.8" fill="#A0432B" stroke="none"/>',
        "</g>",
        '<path d="M266 208 C 290 215, 302 221, 306 230 M375 206 C 350 214, 338 220, 333 229" stroke-width=".9" opacity=".8"/>',
        "</g>",
        '<path d="M122 232 C 222 224, 339 225, 482 234" stroke-width=".8" opacity=".55"/>'
      ].join("");
    }

    if (type === "root") {
      if (variant === 18) {
        return [
          '<g transform="translate(322,136)">',
          '<path d="M-52 -39 C -77 -19, -78 15, -58 37 C -43 53, -21 48, -3 58 C 18 69, 45 60, 51 37 C 58 13, 45 -3, 53 -23 C 62 -46, 42 -63, 18 -58 C -1 -54, -16 -69, -35 -60 C -45 -55, -50 -47, -52 -39Z" stroke-width="2.1"/>',
          '<path d="M-39 -28 C -53 -12, -53 10, -39 24 C -26 37, -8 33, 3 40 C 18 49, 36 42, 38 26 C 40 10, 30 1, 34 -13 C 39 -31, 25 -42, 10 -39" stroke-width=".9" opacity=".7"/>',
          '<path d="M-51 26 C -66 36, -72 50, -70 64" stroke-width="1.1"/>',
          '<path d="M-32 50 C -42 63, -45 75, -42 87" stroke-width="1.1"/>',
          '<path d="M5 58 C 4 72, 9 84, 18 93" stroke-width="1.1"/>',
          '<path d="M43 48 C 55 57, 62 69, 62 81" stroke-width="1.1"/>',
          '<path d="M50 7 C 66 9, 77 18, 82 31" stroke-width="1.1"/>',
          '<path d="M40 -35 C 48 -50, 46 -65, 37 -76" stroke-width="1.2"/>',
          '<path d="M37 -76 C 21 -80, 8 -90, 1 -104" stroke-width="1.1"/>',
          '<path d="M1 -104 C 13 -118, 27 -123, 41 -118 C 34 -104, 20 -96, 1 -104Z" fill="#F6F0E6" stroke-width="1.1"/>',
          '<path d="M1 -104 C -8 -119, -20 -126, -33 -124 C -28 -109, -15 -100, 1 -104Z" fill="#F6F0E6" stroke-width="1.1"/>',
          '<path d="M-23 -11 C -16 -18, -3 -18, 4 -10" stroke-width=".8" opacity=".65"/>',
          '<circle cx="4" cy="16" r="2.5" fill="#A0432B" stroke="none"/>',
          "</g>",
          '<g transform="translate(468,142) rotate(12)">',
          '<path d="M0 0 C 16 -19, 41 -27, 64 -21 C 53 -2, 28 9, 0 0Z" fill="#F6F0E6" stroke-width="1.2"/>',
          '<path d="M13 -6 C 28 -16, 45 -21, 56 -20" stroke-width=".7"/>',
          '<path d="M0 0 C -4 13, -3 25, 3 36" stroke-width="1"/>',
          "</g>"
        ].join("");
      }
      return [
        '<g transform="translate(', 308 + shift, ',0)">',
        '<path d="M12 57 C -3 68, -7 88, 3 101 C 13 114, 0 126, -4 140 C -8 153, 1 164, 10 172 C 18 179, 13 190, 8 200 C 3 211, 10 222, 21 219 C 31 216, 29 203, 25 194 C 21 185, 30 177, 34 167 C 39 155, 31 146, 30 136 C 29 124, 42 113, 42 97 C 42 82, 36 71, 41 61 C 34 52, 24 52, 16 57Z" stroke-width="2.1"/>',
        '<path d="M9 70 C 14 78, 21 84, 30 86" stroke-width=".9" opacity=".75"/>',
        '<path d="M6 92 C 16 100, 25 102, 34 99" stroke-width=".8" opacity=".65"/>',
        '<path d="M8 111 C 18 118, 27 120, 35 117" stroke-width=".8" opacity=".6"/>',
        '<path d="M10 147 C 18 153, 26 155, 33 152" stroke-width=".8" opacity=".6"/>',
        '<path d="M15 180 C 21 186, 27 188, 32 186" stroke-width=".8" opacity=".6"/>',
        '<path d="M0 139 C -16 147, -27 161, -31 177" stroke-width="1.2"/>',
        '<path d="M35 168 C 50 176, 59 190, 60 205" stroke-width="1.2"/>',
        '<path d="M5 202 C -4 213, -15 219, -29 222" stroke-width="1"/>',
        '<path d="M26 196 C 37 205, 42 214, 43 224" stroke-width="1"/>',
        '<path d="M20 218 C 20 225, 18 230, 14 235" stroke-width=".9"/>',
        '<path d="M-25 173 C -36 176, -43 184, -46 194" stroke-width=".8"/>',
        '<path d="M56 195 C 66 198, 72 205, 74 214" stroke-width=".8"/>',
        '<path d="M9 57 C 13 49, 20 46, 27 48" stroke-width="1"/>',
        '<path d="M11 62 C 17 56, 23 54, 29 55" stroke-width=".8"/>',
        '<path d="M14 67 C 19 62, 25 60, 30 61" stroke-width=".8"/>',
        '<path d="M21 49 C 10 39, 1 28, -4 14" stroke-width="1.1"/>',
        '<path d="M-4 14 C -15 21, -23 31, -26 42 C -16 38, -8 29, -4 14Z" fill="#F6F0E6" stroke-width="1"/>',
        '<path d="M27 48 C 24 32, 28 18, 38 8" stroke-width="1.1"/>',
        '<path d="M38 8 C 45 20, 46 32, 42 43 C 35 35, 34 23, 38 8Z" fill="#F6F0E6" stroke-width="1"/>',
        "</g>",
        '<g transform="translate(476,137) rotate(-10)">',
        '<ellipse cx="0" cy="0" rx="54" ry="39" fill="#F6F0E6" stroke-width="1.4"/>',
        '<ellipse cx="0" cy="0" rx="43" ry="30" stroke-width=".85"/>',
        '<ellipse cx="0" cy="0" rx="31" ry="20" stroke-width=".75" opacity=".8"/>',
        '<path d="M-42 0 C -28 -15, 12 -19, 34 -7 M-38 8 C -20 22, 18 23, 37 9" stroke-width=".65" opacity=".65"/>',
        '<path d="M-8 -28 C -13 -14, -13 13, -6 29 M8 -27 C 13 -12, 13 14, 6 28" stroke-width=".6" opacity=".55"/>',
        '<circle cx="0" cy="0" r="2.2" fill="#A0432B" stroke="none"/>',
        "</g>",
        '<g transform="translate(501,195) rotate(18)">',
        '<path d="M0 0 C 18 -11, 35 -9, 49 2 C 35 14, 17 14, 0 0Z" fill="#F6F0E6" stroke-width="1.1"/>',
        '<path d="M13 -1 C 24 -7, 34 -6, 41 -1" stroke-width=".7"/>',
        '<path d="M0 0 C -8 10, -9 21, -7 33" stroke-width=".9"/>',
        "</g>"
      ].join("");
    }

    if (type === "slice") {
      var slices = [
        { x: 232, y: 132, rx: 64, ry: 40, r: -13 },
        { x: 350, y: 154, rx: 67, ry: 42, r: 8 },
        { x: 456, y: 111, rx: 50, ry: 32, r: 24 }
      ];
      return slices.map(function (slice, index) {
        var rings = index === 0 ? 3 : index === 1 ? 4 : 2;
        var details = "";
        for (var r = 1; r <= rings; r += 1) {
          var k = 1 - r * 0.15;
          details += '<ellipse cx="0" cy="0" rx="' + (slice.rx * k).toFixed(1) + '" ry="' + (slice.ry * k).toFixed(1) + '" stroke-width=".8" opacity=".7"/>';
        }
        var rays = "";
        for (var a = 0; a < 9; a += 1) {
          var angle = (Math.PI * 2 / 9) * a + index * 0.3;
          var x1 = Math.cos(angle) * slice.rx * 0.26;
          var y1 = Math.sin(angle) * slice.ry * 0.26;
          var x2 = Math.cos(angle) * slice.rx * 0.74;
          var y2 = Math.sin(angle) * slice.ry * 0.74;
          rays += '<path d="M' + x1.toFixed(1) + " " + y1.toFixed(1) + " L" + x2.toFixed(1) + " " + y2.toFixed(1) + '" stroke-width=".55" opacity=".55"/>';
        }
        return [
          '<g transform="translate(', slice.x + shift, ",", slice.y, ") rotate(", slice.r, ')">',
          '<ellipse cx="0" cy="0" rx="', slice.rx, '" ry="', slice.ry, '" fill="#F6F0E6" stroke-width="1.5"/>',
          details,
          '<path d="M0 0 Q -12 -18 -4 -31" stroke-width=".9" opacity=".7"/>',
          '<path d="M0 0 Q 15 16 28 27" stroke-width=".9" opacity=".7"/>',
          rays,
          '<circle cx="0" cy="0" r="2.4" fill="#A0432B" stroke="none" opacity=".8"/>',
          "</g>"
        ].join("");
      }).join("") +
        '<g transform="translate(118,178) rotate(-22)"><path d="M0 0 C 38 -20, 72 -12, 92 6 C 62 22, 27 18, 0 0Z" stroke-width="1.2"/><path d="M12 2 C 38 10, 64 11, 82 6" stroke-width=".7"/></g>';
    }

    if (type === "stem") {
      if (variant >= 6) {
        return [
          '<g transform="translate(218,214) rotate(-25)">',
          '<path d="M0 0 C 55 -25, 132 -71, 218 -132" stroke-width="5"/>',
          '<path d="M0 0 C 55 -25, 132 -71, 218 -132" stroke-width="1" opacity=".55"/>',
          '<path d="M18 -9 C 25 -44, 48 -52, 64 -49" stroke-width="1.3"/>',
          '<path d="M74 -42 C 72 -67, 83 -80, 104 -88" stroke-width="1.2"/>',
          '<path d="M130 -76 C 126 -103, 143 -117, 165 -121" stroke-width="1.2"/>',
          '<path d="M171 -105 C 174 -123, 186 -132, 201 -134" stroke-width="1.2"/>',
          '<ellipse cx="218" cy="-132" rx="6" ry="15" transform="rotate(33 218 -132)" fill="#F6F0E6"/>',
          '<path d="M208 -140 C 199 -116, 196 -89, 197 -67" stroke-width=".7" opacity=".7"/>',
          '<path d="M195 -64 C 188 -54, 183 -52, 177 -51" stroke-width="1"/>',
          '<path d="M204 -33 C 213 -24, 219 -17, 222 -8" stroke-width="1"/>',
          "</g>",
          '<g transform="translate(444,105)">',
          '<path d="M0 0 C 18 -11, 35 -10, 49 0 C 35 11, 17 11, 0 0Z"/>',
          '<path d="M0 0 C 9 3, 22 6, 34 5" stroke-width=".7"/>',
          '<path d="M-2 1 C -8 -14, -12 -28, -10 -44" stroke-width="1"/>',
          "</g>"
        ].join("");
      }
      return [
        '<g transform="translate(235,54)">',
        '<path d="M0 0 C -8 55, 3 106, -7 169" stroke-width="1.8"/>',
        '<path d="M53 5 C 44 62, 53 112, 44 175" stroke-width="1.8"/>',
        '<path d="M106 -4 C 99 57, 110 109, 101 166" stroke-width="1.8"/>',
        '<path d="M0 31 L12 29 M2 67 L15 65 M0 105 L12 103 M-2 141 L10 139" stroke-width="1"/>',
        '<path d="M53 36 L65 34 M47 73 L60 71 M51 108 L63 106 M45 145 L57 143" stroke-width="1"/>',
        '<path d="M106 27 L118 25 M101 65 L113 63 M107 101 L119 99 M100 137 L112 135" stroke-width="1"/>',
        '<path d="M-1 31 C -14 24, -18 15, -17 8" stroke-width="1"/>',
        '<path d="M53 36 C 66 29, 70 19, 69 12" stroke-width="1"/>',
        '<path d="M106 27 C 94 20, 89 11, 91 4" stroke-width="1"/>',
        '<path d="M-4 105 C -17 98, -21 89, -19 82" stroke-width="1"/>',
        '<path d="M51 108 C 64 101, 68 91, 67 84" stroke-width="1"/>',
        '<path d="M107 101 C 95 94, 90 85, 92 78" stroke-width="1"/>',
        "</g>",
        '<g transform="translate(454,184) rotate(-12)">',
        '<path d="M0 0 C 28 -16, 54 -14, 70 0 C 50 13, 25 13, 0 0Z"/>',
        '<path d="M0 0 C 0 -18, 4 -32, 12 -44" stroke-width="1"/>',
        '<path d="M20 5 C 26 19, 28 30, 26 42" stroke-width="1"/>',
        "</g>"
      ].join("");
    }

    if (type === "flower") {
      function flower(x, y, r) {
        return [
          '<g transform="translate(', x, ",", y, ") rotate(", r, ')">',
          '<path d="M0 0 C -7 9, -8 23, -2 32" stroke-width="1.3"/>',
          '<path d="M-2 32 C -21 30, -32 16, -27 1 C -23 -12, -8 -15, 2 -7 C 10 -1, 9 17, -2 32Z" fill="#F6F0E6"/>',
          '<path d="M-2 32 C 8 13, 17 4, 31 4 C 41 4, 45 15, 38 24 C 30 35, 11 40, -2 32Z" fill="#F6F0E6"/>',
          '<path d="M-2 32 C -1 39, -6 44, -12 42" stroke-width="1"/>',
          '<path d="M-2 31 C 8 22, 23 20, 31 26" stroke-width=".8"/>',
          '<path d="M-15 15 C -19 22, -17 27, -10 30" stroke-width=".7"/>',
          '<path d="M21 9 C 29 6, 36 10, 38 16" stroke-width=".7"/>',
          '<path d="M-16 16 L -31 8 M-11 7 L -23 -4 M17 8 L 31 0 M25 15 L 42 14" stroke-width=".8"/>',
          "</g>"
        ].join("");
      }

      return [
        '<g transform="translate(0,0)">',
        '<path d="M118 224 C 165 178, 225 183, 265 147 C 306 110, 338 109, 392 92 C 438 77, 474 53, 507 25" stroke-width="1.8"/>',
        '<path d="M175 195 C 164 175, 145 168, 127 168 C 144 158, 165 163, 180 178" stroke-width="1.2"/>',
        '<path d="M248 168 C 240 143, 220 131, 198 132 C 221 120, 246 130, 257 152" stroke-width="1.2"/>',
        '<path d="M322 121 C 309 101, 289 94, 270 99 C 286 84, 311 90, 329 108" stroke-width="1.2"/>',
        '<path d="M397 88 C 393 64, 404 46, 425 37 C 414 56, 413 73, 416 88" stroke-width="1.2"/>',
        '<path d="M445 69 C 455 49, 476 42, 495 49 C 476 58, 463 70, 458 84" stroke-width="1.2"/>',
        flower(218, 150, -18),
        flower(337, 105, 8),
        flower(455, 53, -32),
        '<path d="M300 146 C 311 158, 325 161, 337 155" stroke-width=".8"/>',
        "</g>",
        '<g transform="translate(498,182) rotate(-20)">',
        '<path d="M0 0 C 20 -24, 42 -36, 64 -34 C 51 -17, 29 -4, 0 0Z"/>',
        '<path d="M15 -9 C 28 -21, 42 -28, 54 -27" stroke-width=".8"/>',
        "</g>"
      ].join("");
    }

    if (type === "rhizome") {
      var knotShift = variant % 2 === 0 ? -12 : 14;
      return [
        '<g transform="translate(', 300 + shift, ',126)">',
        '<path d="M-92 13 C -70 -22, -27 -38, 1 -27 C 22 -18, 32 0, 54 6 C 80 13, 92 36, 77 56 C 59 79, 24 75, 2 64 C -18 54, -41 66, -62 55 C -84 43, -103 31, -92 13Z" stroke-width="2"/>',
        '<path d="M-56 31 C -31 17, -4 22, 8 36 C 23 53, 8 67, -12 57 C -29 49, -39 35, -56 31Z" stroke-width="1"/>',
        '<path d="M-72 7 C -54 -6, -31 -8, -14 -1" stroke-width=".8"/>',
        '<path d="M27 5 C 42 18, 44 38, 34 51" stroke-width=".8"/>',
        '<path d="M-26 64 C -34 82, -46 93, -62 100" stroke-width="1.2"/>',
        '<path d="M-8 67 C -7 85, -11 98, -21 111" stroke-width="1"/>',
        '<path d="M24 70 C 31 85, 33 99, 27 112" stroke-width="1"/>',
        '<path d="M71 53 C 86 58, 98 70, 101 84" stroke-width="1"/>',
        '<path d="M-89 22 C -107 21, -119 28, -127 39" stroke-width="1"/>',
        '<path d="M-49 22 C -61 12, -64 2, -61 -9" stroke-width="1"/>',
        '<path d="M15 0 C 21 -16, 16 -28, 8 -37" stroke-width="1"/>',
        '<circle cx="3" cy="35" r="3" fill="#A0432B" stroke="none"/>',
        "</g>",
        '<g transform="translate(438,166) rotate(7)">',
        '<ellipse cx="0" cy="0" rx="43" ry="26" fill="#F6F0E6" stroke-width="1.3"/>',
        '<ellipse cx="0" cy="0" rx="30" ry="17" stroke-width=".8"/>',
        '<path d="M-24 -5 C -8 -15, 10 -14, 25 -3 M-20 7 C -4 14, 10 12, 22 5" stroke-width=".7"/>',
        "</g>"
      ].join("");
    }

    if (type === "bulb") {
      return [
        '<g transform="translate(322,144)">',
        '<path d="M-61 7 C -55 -40, -25 -63, 4 -61 C 41 -59, 65 -31, 63 7 C 61 44, 32 61, -2 59 C -36 57, -65 43, -61 7Z" stroke-width="2"/>',
        '<path d="M-41 -16 C -21 -36, 7 -43, 31 -28 C 48 -18, 51 2, 39 17 C 24 36, -5 39, -27 24 C -44 12, -52 -4, -41 -16Z" stroke-width="1"/>',
        '<path d="M-25 4 C -13 -7, 7 -9, 22 0 C 34 8, 35 23, 22 32" stroke-width=".9"/>',
        '<path d="M-51 22 C -65 38, -69 55, -64 68" stroke-width="1.1"/>',
        '<path d="M-32 48 C -43 64, -45 78, -40 91" stroke-width="1.1"/>',
        '<path d="M10 58 C 4 76, 6 89, 15 103" stroke-width="1.1"/>',
        '<path d="M40 51 C 52 65, 57 79, 54 92" stroke-width="1.1"/>',
        '<path d="M60 34 C 74 46, 81 59, 81 72" stroke-width="1.1"/>',
        '<path d="M-6 -59 C 4 -84, 4 -105, -3 -122" stroke-width="1.3"/>',
        '<path d="M-3 -122 C -29 -132, -45 -146, -51 -164" stroke-width="1.2"/>',
        '<path d="M-3 -122 C 20 -135, 35 -150, 40 -168" stroke-width="1.2"/>',
        '<path d="M-3 -122 C 3 -145, 2 -165, -4 -181" stroke-width="1.2"/>',
        '<path d="M-51 -164 C -57 -151, -57 -139, -52 -130 C -44 -137, -44 -151, -51 -164Z" fill="#F6F0E6"/>',
        '<path d="M40 -168 C 46 -154, 45 -142, 38 -133 C 30 -141, 31 -155, 40 -168Z" fill="#F6F0E6"/>',
        '<path d="M-4 -181 C -12 -166, -12 -151, -4 -143 C 4 -153, 4 -168, -4 -181Z" fill="#F6F0E6"/>',
        '<circle cx="-8" cy="7" r="2.7" fill="#A0432B" stroke="none"/>',
        "</g>"
      ].join("");
    }

    if (type === "peel") {
      return [
        '<g transform="translate(254,128) rotate(-8)">',
        '<path d="M-78 48 C -95 4, -71 -42, -23 -57 C 23 -72, 77 -46, 82 -1 C 87 43, 49 67, 7 63 C -22 61, -45 69, -61 67" stroke-width="2"/>',
        '<path d="M-62 53 C -79 13, -58 -29, -18 -42 C 19 -54, 61 -34, 66 -1 C 71 31, 41 50, 9 47 C -16 45, -38 51, -51 51" stroke-width=".8" opacity=".75"/>',
        '<path d="M-42 -37 C -19 -26, 1 -5, 5 18 M-18 -44 C 8 -31, 27 -9, 29 12 M10 -49 C 34 -36, 48 -17, 49 3" stroke-width=".7" opacity=".7"/>',
        '<path d="M-64 27 C -46 37, -27 38, -6 32" stroke-width=".7" opacity=".65"/>',
        '<path d="M52 41 C 64 52, 69 65, 66 78" stroke-width="1"/>',
        "</g>",
        '<g transform="translate(444,156) rotate(18)">',
        '<path d="M-45 28 C -58 -3, -41 -33, -10 -43 C 18 -52, 48 -34, 52 -6 C 56 22, 34 39, 9 37 C -10 36, -25 42, -37 40" stroke-width="1.6"/>',
        '<path d="M-35 31 C -45 4, -31 -20, -9 -28 C 13 -35, 35 -22, 39 -3 C 42 18, 25 30, 7 28 C -8 27, -22 30, -30 30" stroke-width=".7"/>',
        '<path d="M-22 -20 C -5 -12, 7 1, 11 14 M0 -25 C 18 -14, 29 -2, 31 10" stroke-width=".6"/>',
        "<path d=\"M-22 38 C -30 51, -31 62, -27 72\" stroke-width=\".8\"/>",
        "</g>",
        '<g transform="translate(456,80) rotate(-35)">',
        '<path d="M0 0 C 15 -8, 29 -6, 39 2 C 28 11, 13 10, 0 0Z"/>',
        '<path d="M0 0 C -7 8, -8 17, -5 25" stroke-width=".8"/>',
        "</g>"
      ].join("");
    }

    if (type === "leaf") {
      if (variant === 21) {
        return [
          '<g transform="translate(320,54)">',
          '<path d="M0 0 C 2 43, -2 88, 0 157" stroke-width="2"/>',
          '<path d="M0 25 C -25 9, -50 12, -66 30 C -48 44, -21 42, 0 30Z" fill="#F6F0E6" stroke-width="1.3"/>',
          '<path d="M0 60 C 25 43, 50 48, 64 65 C 45 78, 21 76, 0 65Z" fill="#F6F0E6" stroke-width="1.3"/>',
          '<path d="M0 94 C -26 78, -50 81, -65 98 C -47 111, -22 111, 0 101Z" fill="#F6F0E6" stroke-width="1.3"/>',
          '<path d="M0 128 C 23 113, 47 116, 62 133 C 44 145, 21 144, 0 134Z" fill="#F6F0E6" stroke-width="1.3"/>',
          '<path d="M-3 31 C -22 25, -39 25, -53 30 M-3 64 C 16 59, 33 60, 47 65 M-3 99 C -22 93, -38 94, -51 99 M-3 132 C 15 127, 32 129, 46 134" stroke-width=".7"/>',
          '<path d="M0 26 L 5 21 M0 61 L -5 56 M0 95 L 5 90 M0 129 L -5 124" stroke-width="1"/>',
          '<g transform="translate(0,12)">',
          '<path d="M-13 6 C -14 -2, -7 -8, 0 -8 C 7 -8, 14 -2, 13 6 C 6 10, -6 10, -13 6Z" fill="#F6F0E6" stroke-width=".9"/>',
          '<path d="M0 -8 L 0 -19 M-11 1 L -20 -4 M11 1 L 20 -4 M-7 8 L -13 17 M7 8 L 13 17" stroke-width=".8"/>',
          "</g>",
          "</g>",
          '<path d="M192 213 C 278 204, 369 203, 465 211" stroke-width=".9" stroke-dasharray="2 5" opacity=".65"/>'
        ].join("");
      }

      if (variant === 25) {
        return [
          '<g transform="translate(320,218)">',
          '<path d="M0 0 C -3 -44, 4 -78, 12 -106" stroke-width="1.8"/>',
          '<path d="M12 -106 C -18 -137, -54 -147, -80 -135 C -71 -107, -42 -89, 12 -106Z" fill="#F6F0E6" stroke-width="1.5"/>',
          '<path d="M12 -106 C 43 -138, 78 -142, 100 -128 C 88 -99, 56 -87, 12 -106Z" fill="#F6F0E6" stroke-width="1.5"/>',
          '<path d="M12 -106 C 10 -146, 22 -174, 46 -187 C 65 -166, 64 -132, 12 -106Z" fill="#F6F0E6" stroke-width="1.5"/>',
          '<path d="M12 -106 C -13 -117, -35 -120, -55 -115 M12 -106 C 36 -119, 61 -121, 82 -114 M12 -106 C 17 -126, 25 -145, 39 -162" stroke-width=".9"/>',
          '<path d="M-25 -116 L -31 -108 M-43 -116 L -48 -107 M37 -118 L 44 -110 M58 -118 L 64 -110 M29 -137 L 38 -132 M23 -151 L 33 -147" stroke-width=".7"/>',
          '<path d="M0 0 C 9 7, 15 14, 18 21 M-3 -17 C -14 -12, -23 -5, -28 3" stroke-width=".9"/>',
          '<circle cx="12" cy="-106" r="2.3" fill="#A0432B" stroke="none"/>',
          "</g>"
        ].join("");
      }

      if (variant === 29) {
        return [
          '<g transform="translate(156,210) rotate(-14)">',
          '<path d="M0 0 C 109 -29, 216 -66, 327 -104" stroke-width="2"/>',
          '<path d="M92 -27 C 77 -49, 86 -71, 111 -82 C 133 -66, 135 -41, 110 -23" stroke-width="1.1"/>',
          '<g transform="translate(206,36) rotate(-30)">',
          '<path d="M0 0 C -32 -22, -37 -60, -8 -84 C 26 -70, 35 -32, 0 0Z" fill="#F6F0E6" stroke-width="1.5"/>',
          '<path d="M-3 -3 C -4 -29, -4 -53, -4 -74" stroke-width=".9"/>',
          '<path d="M-4 -24 C -16 -34, -23 -45, -25 -56 M-4 -40 C -14 -49, -20 -58, -22 -66 M-4 -24 C 9 -34, 16 -44, 18 -55 M-4 -41 C 6 -49, 12 -57, 14 -64" stroke-width=".7"/>',
          '<path d="M-26 -14 L -32 -9 M-21 8 L -27 13 M13 -17 L 20 -12 M17 6 L 24 11" stroke-width=".7"/>',
          "</g>",
          '<g transform="translate(331,-4) rotate(22)">',
          '<path d="M0 0 C -31 -18, -40 -53, -14 -78 C 19 -67, 33 -33, 0 0Z" fill="#F6F0E6" stroke-width="1.5"/>',
          '<path d="M-3 -3 C -3 -27, -2 -50, -1 -68" stroke-width=".9"/>',
          '<path d="M-4 -22 C -15 -30, -23 -39, -26 -49 M-3 -38 C -13 -46, -20 -54, -23 -62 M-3 -22 C 8 -30, 15 -38, 18 -47 M-3 -37 C 6 -44, 12 -50, 14 -57" stroke-width=".7"/>',
          '<path d="M-28 -8 L -34 -3 M15 -10 L 22 -5" stroke-width=".7"/>',
          "</g>",
          '<path d="M43 -17 C 55 -23, 65 -29, 75 -37" stroke-width="1"/>',
          "</g>",
          '<path d="M170 224 C 265 216, 355 216, 456 223" stroke-width=".9" opacity=".6"/>'
        ].join("");
      }

      var leafX = [258, 345, 430];
      return leafX.map(function (x, index) {
        var y = index === 1 ? 137 : 105;
        var rot = index === 1 ? 14 : index === 0 ? -18 : 28;
        return [
          '<g transform="translate(', x + shift, ",", y, ") rotate(", rot, ')">',
          '<path d="M0 0 C -31 -21, -35 -59, -3 -81 C 30 -60, 29 -22, 0 0Z" fill="#F6F0E6" stroke-width="1.6"/>',
          '<path d="M0 0 C -2 -26, -1 -51, 0 -72" stroke-width="1"/>',
          '<path d="M0 -18 C -12 -27, -19 -39, -21 -51 M0 -33 C -9 -41, -15 -50, -17 -59 M0 -18 C 12 -27, 19 -38, 21 -49 M0 -34 C 9 -42, 15 -50, 18 -58" stroke-width=".65"/>',
          '<path d="M0 0 C 4 18, 5 34, 2 49" stroke-width=".9"/>',
          "</g>"
        ].join("");
      }).join("") +
        '<g transform="translate(346,226)"><path d="M-122 2 C -55 -7, 49 -8, 128 0" stroke-width="1.1" opacity=".7"/></g>';
    }

    if (type === "fruit") {
      if (variant === 22) {
        return [
          '<g transform="translate(0,0)">',
          '<path d="M176 207 C 238 174, 301 156, 363 156 C 406 156, 447 142, 482 118" stroke-width="1.7"/>',
          '<path d="M245 170 C 226 150, 205 141, 184 143 C 201 128, 228 135, 246 154" stroke-width="1.1"/>',
          '<path d="M366 157 C 350 135, 354 116, 372 101 C 376 122, 388 137, 402 147" stroke-width="1.1"/>',
          '<g transform="translate(279,134)">',
          '<circle cx="0" cy="0" r="29" fill="#F6F0E6" stroke-width="1.7"/>',
          '<path d="M0 -29 L 0 -39" stroke-width="1.1"/>',
          '<path d="M-8 -30 L -4 -39 M8 -30 L 4 -39 M-15 -26 L -13 -35 M15 -26 L 13 -35" stroke-width=".8"/>',
          '<path d="M-20 8 C -12 22, 12 22, 20 8" stroke-width=".7" opacity=".65"/>',
          '<path d="M-26 -5 C -20 -18, -8 -26, 5 -27" stroke-width=".7" opacity=".55"/>',
          '<circle cx="3" cy="3" r="2.5" fill="#A0432B" stroke="none"/>',
          "</g>",
          '<g transform="translate(363,116)">',
          '<circle cx="0" cy="0" r="23" fill="#F6F0E6" stroke-width="1.5"/>',
          '<path d="M0 -23 L 0 -31 M-7 -23 L -4 -30 M7 -23 L 4 -30" stroke-width=".7"/>',
          '<path d="M-15 5 C -8 16, 9 16, 15 5" stroke-width=".65" opacity=".6"/>',
          "</g>",
          '<g transform="translate(437,153)">',
          '<circle cx="0" cy="0" r="25" fill="#F6F0E6" stroke-width="1.5"/>',
          '<path d="M0 -25 L 0 -34 M-8 -25 L -4 -33 M8 -25 L 4 -33" stroke-width=".7"/>',
          '<path d="M-17 4 C -9 17, 9 17, 17 4" stroke-width=".65" opacity=".6"/>',
          '<circle cx="0" cy="2" r="2.2" fill="#A0432B" stroke="none"/>',
          "</g>",
          '<g transform="translate(367,93) rotate(20)">',
          '<path d="M0 0 C 16 -10, 33 -9, 45 1 C 31 11, 14 11, 0 0Z" fill="#F6F0E6" stroke-width="1"/>',
          '<path d="M10 -1 C 20 -6, 31 -5, 38 -1" stroke-width=".6"/>',
          "</g>",
          "</g>"
        ].join("");
      }

      if (variant === 24) {
        var schisandra = [
          { x: 223, y: 111, r: 12 }, { x: 257, y: 145, r: 13 },
          { x: 292, y: 106, r: 11 }, { x: 328, y: 151, r: 13 },
          { x: 365, y: 112, r: 12 }, { x: 402, y: 151, r: 12 },
          { x: 439, y: 113, r: 11 }, { x: 473, y: 144, r: 10 }
        ];
        return [
          '<g transform="translate(0,0)">',
          '<path d="M167 150 C 218 112, 284 90, 345 90 C 397 90, 442 76, 485 54" stroke-width="1.7"/>',
          schisandra.map(function (berry) {
            return [
              '<path d="M', berry.x - 3, " ", berry.y - berry.r - 2, " C ", berry.x - 10, " ", berry.y - berry.r - 16, ", ", berry.x + 4, " ", berry.y - berry.r - 24, ", ", berry.x + 12, " ", berry.y - berry.r - 17, '" stroke-width=".8"/>',
              '<circle cx="', berry.x, '" cy="', berry.y, '" r="', berry.r, '" fill="#F6F0E6" stroke-width="1.2"/>',
              '<path d="M', berry.x - berry.r * .6, " ", berry.y - 1, " C ", berry.x - berry.r * .25, " ", berry.y - berry.r * .7, ", ", berry.x + berry.r * .35, " ", berry.y - berry.r * .5, ", ", berry.x + berry.r * .55, " ", berry.y + 1, '" stroke-width=".55" opacity=".65"/>',
              '<circle cx="', berry.x, '" cy="', berry.y, '" r="1.5" fill="#A0432B" stroke="none" opacity=".7"/>'
            ].join("");
          }).join(""),
          '<g transform="translate(268,80) rotate(-18)"><path d="M0 0 C 15 -17, 35 -24, 54 -18 C 43 -2, 22 8, 0 0Z" fill="#F6F0E6" stroke-width="1"/><path d="M11 -5 C 24 -13, 38 -17, 47 -16" stroke-width=".6"/></g>',
          '<g transform="translate(417,67) rotate(22)"><path d="M0 0 C 12 -14, 29 -20, 44 -15 C 35 -2, 18 6, 0 0Z" fill="#F6F0E6" stroke-width=".9"/></g>',
          "</g>"
        ].join("");
      }

      if (variant === 30) {
        var goji = [
          { x: 241, y: 128, r: 13, rot: -18 },
          { x: 292, y: 158, r: 12, rot: 12 },
          { x: 345, y: 122, r: 14, rot: -8 },
          { x: 399, y: 155, r: 12, rot: 20 },
          { x: 451, y: 119, r: 13, rot: -15 },
          { x: 499, y: 151, r: 11, rot: 8 }
        ];
        return [
          '<g transform="translate(0,0)">',
          '<path d="M170 96 C 232 123, 298 128, 363 113 C 418 101, 465 106, 521 128" stroke-width="1.7"/>',
          goji.map(function (berry) {
            return [
              '<g transform="translate(', berry.x, ",", berry.y, ") rotate(", berry.rot, ')">',
              '<ellipse cx="0" cy="0" rx="', berry.r * .72, '" ry="', berry.r * 1.22, '" fill="#F6F0E6" stroke-width="1.3"/>',
              '<path d="M0 ', -berry.r * 1.22, " L 0 ", -berry.r * 1.22 - 9, '" stroke-width=".8"/>',
              '<path d="M-2 ', -berry.r * .3, " C -5 ", berry.r * .2, ", -3 ", berry.r * .65, ", 3 ", berry.r * .82, '" stroke-width=".55" opacity=".65"/>',
              '<circle cx="0" cy="', -berry.r * .9, '" r="1.3" fill="#A0432B" stroke="none"/>',
              "</g>"
            ].join("");
          }).join(""),
          '<g transform="translate(321,96) rotate(-19)"><path d="M0 0 C 17 -13, 37 -13, 52 -1 C 35 11, 16 11, 0 0Z" fill="#F6F0E6" stroke-width="1"/><path d="M12 -1 C 25 -6, 37 -6, 45 -1" stroke-width=".55"/></g>',
          '<g transform="translate(470,111) rotate(18)"><path d="M0 0 C 13 -11, 29 -11, 41 0 C 28 9, 12 9, 0 0Z" fill="#F6F0E6" stroke-width=".9"/></g>',
          "</g>"
        ].join("");
      }

      var berries = [
        { x: 248, y: 123, r: 20 },
        { x: 291, y: 97, r: 15 },
        { x: 314, y: 143, r: 18 },
        { x: 356, y: 117, r: 22 },
        { x: 391, y: 157, r: 14 },
        { x: 419, y: 99, r: 17 }
      ];
      return [
        '<g transform="translate(14,0)">',
        '<path d="M176 199 C 222 165, 271 146, 323 143 C 370 140, 413 121, 454 83" stroke-width="1.7"/>',
        '<path d="M240 159 C 226 139, 209 129, 190 128 C 207 116, 230 123, 245 140" stroke-width="1.1"/>',
        '<path d="M332 142 C 324 118, 333 99, 352 87 C 349 108, 356 123, 368 133" stroke-width="1.1"/>',
        berries.map(function (berry, index) {
          return [
            '<g transform="translate(', berry.x + shift * .4, ",", berry.y, ')">',
            '<circle cx="0" cy="0" r="', berry.r, '" fill="#F6F0E6" stroke-width="1.5"/>',
            '<path d="M', -berry.r * .55, " ", -berry.r * .1, " Q ", -berry.r * .25, " ", -berry.r * .6, ", ", berry.r * .28, " ", -berry.r * .52, '" stroke-width=".7" opacity=".7"/>',
            '<path d="M0 ' + (-berry.r) + ' l0 -8 M-5 -' + (berry.r - 2) + ' l -3 -7 M5 -' + (berry.r - 2) + ' l 3 -7" stroke-width=".9"/>',
            '<circle cx="0" cy="0" r="2" fill="#A0432B" stroke="none" opacity=".75"/>',
            '<path d="M', -berry.r * .35, " ", berry.r * .3, " Q ", 0, " ", berry.r * .55, ", ", berry.r * .3, " ", berry.r * .27, '" stroke-width=".6" opacity=".6"/>',
            "</g>"
          ].join("");
        }).join(""),
        "</g>",
        '<g transform="translate(490,100) rotate(22)">',
        '<path d="M0 0 C -17 -7, -28 -23, -25 -41 C -8 -34, 4 -21, 0 0Z" fill="#F6F0E6" stroke-width="1.1"/>',
        '<path d="M-3 -2 C -10 -13, -17 -23, -22 -34" stroke-width=".6"/>',
        "</g>"
      ].join("");
    }

    if (type === "seed") {
      return [
        '<g transform="translate(0,0)">',
        '<g transform="translate(249,153) rotate(-24)"><ellipse cx="0" cy="0" rx="55" ry="31" fill="#F6F0E6" stroke-width="1.7"/><path d="M-45 -6 C -26 -24, 20 -28, 44 -7 M-42 8 C -21 23, 16 23, 40 8" stroke-width=".75"/><path d="M-14 0 C -6 -7, 5 -7, 13 0 C 5 7, -6 7, -14 0Z" stroke-width=".8"/><circle cx="0" cy="0" r="2" fill="#A0432B" stroke="none"/></g>',
        '<g transform="translate(386,100) rotate(18)"><ellipse cx="0" cy="0" rx="49" ry="28" fill="#F6F0E6" stroke-width="1.5"/><path d="M-39 -5 C -22 -20, 15 -23, 38 -7 M-36 7 C -18 19, 15 20, 35 7" stroke-width=".7"/><path d="M-12 0 C -5 -6, 5 -6, 12 0 C 5 6, -5 6, -12 0Z" stroke-width=".8"/><circle cx="0" cy="0" r="2" fill="#A0432B" stroke="none"/></g>',
        '<g transform="translate(464,174) rotate(-9)"><ellipse cx="0" cy="0" rx="43" ry="24" fill="#F6F0E6" stroke-width="1.3"/><path d="M-34 -4 C -19 -17, 13 -20, 33 -6 M-31 6 C -16 16, 13 17, 30 6" stroke-width=".7"/><path d="M-10 0 C -4 -5, 4 -5, 10 0 C 4 5, -4 5, -10 0Z" stroke-width=".7"/></g>',
        '<path d="M210 206 C 274 192, 359 188, 438 199 C 474 204, 503 199, 526 189" stroke-width="1" stroke-dasharray="2 4" opacity=".7"/>',
        "</g>"
      ].join("");
    }

    if (type === "fungus") {
      return [
        '<g transform="translate(320,135)">',
        '<path d="M-89 35 C -111 -1, -92 -43, -53 -55 C -22 -65, 8 -50, 31 -55 C 69 -63, 103 -39, 96 -7 C 90 23, 63 25, 49 44 C 33 66, -5 76, -32 62 C -57 49, -74 59, -89 35Z" stroke-width="2"/>',
        '<path d="M-56 29 C -68 9, -57 -18, -31 -29 C -9 -39, 19 -30, 38 -31 C 64 -33, 81 -17, 76 2 C 72 21, 50 20, 39 34 C 25 51, -1 55, -22 45 C -39 37, -48 43, -56 29Z" stroke-width="1"/>',
        '<path d="M-34 14 C -40 1, -30 -12, -14 -16 C 2 -21, 18 -15, 28 -15" stroke-width=".8" opacity=".7"/>',
        '<path d="M-52 -35 C -44 -51, -23 -60, -5 -56" stroke-width=".8" opacity=".7"/>',
        '<path d="M71 4 C 86 13, 91 29, 85 43" stroke-width="1.1"/>',
        '<path d="M-53 42 C -67 54, -72 69, -68 82" stroke-width="1.1"/>',
        '<circle cx="-12" cy="8" r="2.8" fill="#A0432B" stroke="none"/>',
        "</g>",
        '<g transform="translate(480,167) rotate(8)">',
        '<path d="M0 0 L 46 0 L 46 52 L 0 52Z" stroke-width="1.2"/>',
        '<path d="M8 9 C 21 4, 32 9, 38 18 C 30 30, 15 33, 7 28 C 0 23, 2 14, 8 9Z" stroke-width=".8"/>',
        '<path d="M12 40 C 22 33, 34 35, 40 41" stroke-width=".7"/>',
        "</g>"
      ].join("");
    }

    if (type === "scale-bulb") {
      return [
        '<g transform="translate(300,138)">',
        '<path d="M-47 10 C -45 -21, -22 -41, 3 -38 C 29 -35, 48 -16, 45 12 C 42 39, 21 51, -5 48 C -30 45, -49 37, -47 10Z" stroke-width="1.8"/>',
        '<path d="M-31 -5 C -16 -24, 9 -29, 28 -14 C 38 -5, 38 10, 28 20 C 15 32, -9 32, -22 19 C -31 10, -37 2, -31 -5Z" stroke-width=".9"/>',
        '<path d="M-44 6 C -33 -3, -20 -3, -10 4" stroke-width=".7"/>',
        '<path d="M-38 27 C -22 35, 1 38, 18 31" stroke-width=".7"/>',
        '<path d="M-7 -38 C 2 -55, 18 -64, 35 -60 C 29 -42, 14 -32, -2 -31" stroke-width="1.2"/>',
        '<path d="M-39 30 C -48 43, -55 50, -65 55" stroke-width="1"/>',
        '<path d="M-14 48 C -19 61, -28 69, -38 74" stroke-width="1"/>',
        '<path d="M17 45 C 16 59, 20 69, 28 77" stroke-width="1"/>',
        '<path d="M42 29 C 51 41, 55 51, 53 62" stroke-width="1"/>',
        '<circle cx="-6" cy="13" r="2.5" fill="#A0432B" stroke="none"/>',
        "</g>",
        '<g transform="translate(465,83) rotate(14)">',
        '<path d="M0 0 C 18 -16, 42 -17, 58 0 C 42 17, 18 16, 0 0Z" fill="#F6F0E6" stroke-width="1.2"/>',
        '<path d="M8 -2 C 23 -11, 38 -11, 50 -1" stroke-width=".7"/>',
        "</g>"
      ].join("");
    }

    if (type === "dendrobium") {
      return [
        '<g transform="translate(208,66)">',
        '<path d="M74 0 C 56 51, 69 104, 48 160 C 76 109, 103 63, 116 8" stroke-width="1.8"/>',
        '<path d="M111 16 C 95 68, 108 121, 86 176 C 119 124, 140 81, 151 30" stroke-width="1.8"/>',
        '<path d="M148 45 C 137 91, 147 135, 127 187 C 159 141, 178 104, 187 59" stroke-width="1.8"/>',
        '<path d="M74 0 C 78 18, 74 35, 66 49" stroke-width="1.2"/>',
        '<path d="M107 42 C 98 40, 90 42, 84 48" stroke-width="1"/>',
        '<path d="M96 96 C 87 94, 79 96, 73 101" stroke-width="1"/>',
        '<path d="M86 150 C 77 148, 69 151, 63 157" stroke-width="1"/>',
        '<path d="M136 77 C 127 75, 119 77, 113 83" stroke-width="1"/>',
        '<path d="M128 130 C 119 128, 111 131, 105 136" stroke-width="1"/>',
        '<path d="M118 177 C 109 175, 101 178, 95 184" stroke-width="1"/>',
        '<path d="M176 108 C 167 106, 159 109, 153 114" stroke-width="1"/>',
        '<path d="M166 157 C 157 155, 149 158, 143 163" stroke-width="1"/>',
        '<path d="M74 0 C 81 -5, 90 -5, 97 0" stroke-width="1"/>',
        '<path d="M110 16 C 117 11, 126 11, 133 16" stroke-width="1"/>',
        '<path d="M148 45 C 155 40, 164 40, 171 45" stroke-width="1"/>',
        '<path d="M84 88 C 98 84, 115 88, 129 99" stroke-width=".8" opacity=".7"/>',
        "</g>",
        '<g transform="translate(360,159) rotate(-20)">',
        '<path d="M0 0 C 15 -26, 40 -39, 66 -35 C 55 -12, 32 2, 0 0Z" fill="#F6F0E6" stroke-width="1.2"/>',
        '<path d="M15 -7 C 30 -21, 46 -29, 58 -29" stroke-width=".7"/>',
        "</g>",
        '<g transform="translate(433,110) rotate(24)">',
        '<path d="M0 0 C 10 -21, 30 -33, 50 -31 C 42 -12, 23 0, 0 0Z" fill="#F6F0E6" stroke-width="1.1"/>',
        '<path d="M11 -5 C 23 -17, 35 -24, 44 -24" stroke-width=".65"/>',
        "</g>",
        '<path d="M263 173 C 291 161, 316 167, 328 186" stroke-width="5" opacity=".9"/>',
        '<path d="M263 173 C 291 161, 316 167, 328 186" stroke-width="1" stroke="#F6F0E6"/>'
      ].join("");
    }

    return "";
  }

  function specimenSVG(herb) {
    var number = formatNumber(herb._index + 1);
    var latin = String(herb.latin || "").toUpperCase();
    var safeName = escapeHTML(herb.name);
    var safeLatin = escapeHTML(latin);
    var safePart = escapeHTML(herb.part || "");
    return [
      '<svg viewBox="0 0 640 260" role="img" aria-label="',
      escapeAttr(herb.name + "药材示意图，非实物照片"),
      '" xmlns="http://www.w3.org/2000/svg">',
      '<rect width="640" height="260" fill="#F2EADD"/>',
      '<g stroke="#D8CCBA" stroke-width=".6" fill="none" opacity=".9">',
      '<path d="M0 34 H640 M0 226 H640 M40 0 V260 M600 0 V260"/>',
      '<path d="M0 130 H640" stroke-dasharray="1 7" opacity=".55"/>',
      "</g>",
      '<g fill="none" stroke="#211C17" stroke-linecap="round" stroke-linejoin="round">',
      specimenDrawing(herb),
      "</g>",
      '<g font-family="Menlo, Consolas, monospace" fill="#6E6153" font-size="7.4" letter-spacing="1.2">',
      "<text x=\"24\" y=\"23\">PLATE ", number, "</text>",
      '<text x="616" y="23" text-anchor="end">', safeLatin, "</text>",
      '<text x="24" y="246">', safePart, " · 药材示意</text>",
      '<text x="616" y="246" text-anchor="end">NOT TO SCALE</text>',
      "</g>",
      '<g transform="translate(584,204)">',
      '<rect width="24" height="24" fill="none" stroke="#A0432B" stroke-width=".8"/>',
      '<text x="12" y="16.5" text-anchor="middle" font-family="Songti SC, serif" font-size="10" fill="#A0432B">药</text>',
      "</g>",
      "</svg>"
    ].join("");
  }

  /* =========================================================
     详情抽屉
     ========================================================= */

  function pills(items, modifier) {
    return (items || []).map(function (item) {
      return '<span class="pill' + (modifier ? " " + modifier : "") + '">' + escapeHTML(item) + "</span>";
    }).join("");
  }

  function sectionHTML(number, title, content) {
    return [
      '<section class="detail-section">',
      '<div class="detail-section-head">',
      '<span class="detail-section-no">', formatNumber(number), "</span>",
      "<h3>", escapeHTML(title), "</h3>",
      "</div>",
      content,
      "</section>"
    ].join("");
  }

  function pairDetailHTML(herb) {
    var valid = (herb.pairs || []).map(function (pair) {
      var other = herbMap[pair.id];
      if (!other) return "";
      return [
        '<button class="pair-detail" type="button" data-herb-id="', escapeAttr(other.id), '">',
        '<span class="pair-detail-main">',
        '<span class="pair-detail-name">', escapeHTML(other.name), "</span>",
        '<span class="pair-detail-note">', escapeHTML(pair.note), "</span>",
        "</span>",
        '<span class="pair-detail-arrow" aria-hidden="true">↗</span>',
        "</button>"
      ].join("");
    }).filter(Boolean);

    if (!valid.length) {
      return '<p class="detail-copy">这一味尚未在谱中结成固定药对。可在上方按功效反查，寻找它的邻居。</p>';
    }

    return '<div class="pair-detail-list">' + valid.join("") + "</div>";
  }

  function detailHTML(herb) {
    var toxic = String(herb.toxicity || "无毒") !== "无毒";
    var protection = herb.protection || "资料待核";
    var aliases = (herb.aliases || []).join("、");
    var primary = (herb.efficacy && herb.efficacy[0]) || "本草";
    var narrativeBadge = (herb.narrativeTags || []).length
      ? '<span class="badge">叙事标签：' + escapeHTML((herb.narrativeTags || []).join("、")) + "</span>"
      : "";

    var facts = [
      ["药用部位", escapeHTML(herb.part) + (herb.partNote ? "（" + escapeHTML(herb.partNote) + "）" : "")],
      ["性味", escapeHTML((herb.flavors || []).join("、") + " · " + herb.nature)],
      ["归经", escapeHTML((herb.meridians || []).join("、"))],
      ["科属", escapeHTML(herb.family)],
      ["毒性", '<span class="' + (toxic ? "is-tox" : "") + '">' + escapeHTML(herb.toxicity || "资料待核") + "</span>", true],
      ["保护级别", escapeHTML(protection), true]
    ];

    var factsHTML = '<dl class="detail-facts">' + facts.map(function (fact) {
      return [
        '<div class="detail-fact', fact[2] ? " is-wide" : "", '">',
        "<dt>", fact[0], "</dt>",
        "<dd>", fact[1], "</dd>",
        "</div>"
      ].join("");
    }).join("") + "</dl>";

    var toxWarning = toxic ? [
      '<div class="tox-warning">',
      '<span class="tox-warning-mark" aria-hidden="true">!</span>',
      "<div>",
      "<strong>", escapeHTML(herb.toxicity), " · ", escapeHTML(herb.toxAction || "需炮制"), " · 切勿自行使用</strong>",
      "<p>", escapeHTML(herb.toxicNote || "该药材有明确毒性风险，须由专业人员处理。切勿自行采挖、炮制或服用。"), "</p>",
      "</div>",
      "</div>"
    ].join("") : "";

    var narrativeNote = (herb.narrativeNote) ? [
      '<div class="tox-warning" style="border-color:var(--ink-muted)">',
      '<span class="tox-warning-mark" aria-hidden="true" style="border-color:var(--ink-muted);color:var(--ink-muted)">文</span>',
      "<div><strong style=\"color:var(--ink)\">叙事母题说明</strong><p>", escapeHTML(herb.narrativeNote), "</p></div>",
      "</div>"
    ].join("") : "";

    var contraRows = [
      ["孕妇", herb.contra && herb.contra.pregnancy],
      ["阴虚", herb.contra && herb.contra.yin],
      ["实热", herb.contra && herb.contra.heat],
      ["配伍", herb.contra && herb.contra.incompat],
      ["其他", herb.contra && herb.contra.other]
    ].filter(function (row) { return row[1]; }).map(function (row) {
      var important = /禁用|大毒|剧毒|切勿|肝损伤|反/.test(row[1]);
      return [
        '<div class="contra-row', important ? " is-important" : "", '">',
        "<dt>", escapeHTML(row[0]), "</dt>",
        "<dd>", escapeHTML(row[1]), "</dd>",
        "</div>"
      ].join("");
    }).join("");

    var processing = (herb.processing || []).map(function (item) {
      return "<li>" + escapeHTML(item) + "</li>";
    }).join("");

    var morphology = [
      ["叶", herb.morphology && herb.morphology.leaf],
      ["花 / 果", herb.morphology && herb.morphology.flower],
      ["根 / 饮片", herb.morphology && herb.morphology.root],
      ["株高", herb.morphology && herb.morphology.height]
    ].filter(function (row) { return row[1]; }).map(function (row) {
      return [
        '<div class="morph-item">',
        "<dt>", escapeHTML(row[0]), "</dt>",
        "<dd>", escapeHTML(row[1]), "</dd>",
        "</div>"
      ].join("");
    }).join("");

    var review = (herb.review || []).length ? [
      '<ul class="review-list">',
      herb.review.map(function (item) { return "<li>" + escapeHTML(item) + "</li>"; }).join(""),
      "</ul>"
    ].join("") : '<p class="detail-copy">暂无额外待核项。</p>';

    var content = [
      '<header class="detail-hero">',
      '<div class="detail-topline">',
      '<span>NO. ', formatNumber(herb._index + 1), " / ", formatNumber(HERBS.length), "</span>",
      '<span>', escapeHTML(herb.family), "</span>",
      "</div>",
      '<div class="detail-title-row">',
      '<div class="detail-heading">',
      '<h2 class="detail-name" id="drawerTitle">', escapeHTML(herb.name), "</h2>",
      '<p class="detail-pinyin">', escapeHTML(herb.pinyin || ""), "</p>",
      '<p class="detail-en">', escapeHTML(herb.en), "</p>",
      '<p class="detail-latin">', escapeHTML(herb.latin), "</p>",
      "</div>",
      '<span class="detail-seal" aria-label="功效印：', escapeAttr(primary), '">', escapeHTML(primary), "</span>",
      "</div>",
      '<div class="detail-badges">',
      toxic ? '<span class="badge badge-tox">' + escapeHTML(herb.toxicity) + " · " + escapeHTML(herb.toxAction || "需炮制") + "</span>" : "",
      sourceLabel(herb) ? '<span class="badge badge-source">' + escapeHTML(sourceLabel(herb)) + "</span>" : "",
      '<span class="badge">', escapeHTML(herb.nature), " · ", escapeHTML((herb.flavors || []).join("、")), "</span>",
      narrativeBadge,
      '<span class="badge badge-protect">保护：', escapeHTML(protection), "</span>",
      "</div>",
      aliases ? '<p class="detail-aliases">别名 <span>' + escapeHTML(aliases) + "</span></p>" : "",
      '<div class="specimen-figure">', specimenSVG(herb), "</div>",
      '<div class="specimen-caption"><span>药材示意 · SPECIMEN FIGURE</span><span>非实物照片 · 不可据此采药</span></div>',
      "</header>",

      factsHTML,

      toxWarning,
      narrativeNote,
      herb.specialWarning ? [
        '<div class="tox-warning special-warning">',
        '<span class="tox-warning-mark" aria-hidden="true">!</span>',
        "<div><strong>来源与安全提示</strong><p>", escapeHTML(herb.specialWarning), "</p></div>",
        "</div>"
      ].join("") : "",

      sectionHTML(1, "功效与主治",
        '<div class="pill-list">' + pills(herb.efficacy || [], "is-efficacy") + "</div>" +
        '<p class="detail-copy" style="margin-top:12px">' + escapeHTML((herb.indications || []).join(" · ")) + "</p>" +
        (herb.classificationNote ? '<p class="detail-note">' + escapeHTML(herb.classificationNote) + "</p>" : "")
      ),

      sectionHTML(2, "禁忌与安全",
        '<dl class="contra-list">' + contraRows + "</dl>" +
        '<p class="detail-note"><strong>配伍提示：</strong>十八反、十九畏只作提示，不展开用法。孕妇禁忌不做具体处方建议。</p>' +
        (toxic ? '<p class="detail-note"><strong>毒性提示：</strong>' + escapeHTML(herb.toxicNote || "") + "</p>" : "")
      ),

      sectionHTML(3, "药对 · 为什么配在一起", pairDetailHTML(herb)),

      sectionHTML(4, "产地 · 采收 · 炮制",
        '<dl class="data-block">' +
        '<div class="data-row"><dt>产地</dt><dd>' + escapeHTML(herb.origin || "资料待核") + "</dd></div>" +
        '<div class="data-row"><dt>采收</dt><dd>' + escapeHTML(herb.harvest || "资料待核") + "</dd></div>" +
        "</dl>" +
        '<ul class="review-list" style="margin-top:10px">' + processing + "</ul>" +
        '<p class="detail-note">仅列炮制名称与目的，不提供可操作步骤；毒性药材必须由专业机构规范炮制。</p>'
      ),

      sectionHTML(5, "形态与气味",
        '<dl class="morph-grid">' + morphology + "</dl>" +
        '<p class="detail-note">气味：<span>' + escapeHTML(herb.scent || "资料待核") + "</span></p>"
      ),

      sectionHTML(6, "传说 / 文化",
        '<p class="detail-copy">' + escapeHTML(herb.legend || "资料待核。") + "</p>"
      ),

      sectionHTML(7, "创作提示",
        '<p class="detail-copy">' + escapeHTML(herb.creative || "资料待核。") + "</p>"
      ),

      sectionHTML(8, "常见误用",
        '<p class="detail-copy">' + escapeHTML(herb.misuse || "资料待核。") + "</p>"
      ),

      sectionHTML(9, "冷知识",
        '<p class="detail-copy">' + escapeHTML(herb.trivia || "资料待核。") + "</p>"
      ),

      sectionHTML(10, "校勘 / 资料待核", review),

      '<div class="detail-disclaimer">',
      "<strong>创作参考，非处方。</strong>",
      "本页仅用于小说、绘画与考据创作，不构成医疗建议；不要据此用药。性味、归经、禁忌与保护级别中标注「资料待核」者，表示暂未完成可靠来源核对。",
      '<button class="text-link print-link" type="button" data-print-herb>打印A5药方签 ↗</button>',
      "</div>",
      '<p class="detail-footer-note">草药谱 · HERBAL INDEX · SIMON WORKSHOP™</p>'
    ].join("");

    return content;
  }

  function openHerb(id, options) {
    var herb = herbMap[id];
    if (!herb) return false;
    options = options || {};

    if (!drawerOpen) lastFocused = document.activeElement;

    activeHerbId = herb.id;
    els.drawerContent.innerHTML = detailHTML(herb);
    els.drawerIndex.textContent = "NO. " + formatNumber(herb._index + 1) + " / " + formatNumber(HERBS.length) + " · 药材抽屉";
    els.drawerContent.scrollTop = 0;
    els.drawerRoot.hidden = false;
    els.drawerRoot.setAttribute("aria-hidden", "false");
    els.body.classList.add("drawer-open");
    drawerOpen = true;
    document.title = "草药谱 · " + herb.name;

    if (options.push !== false && window.location.hash !== "#" + herb.id) {
      window.history.pushState({ herb: herb.id }, "", "#" + herb.id);
    }

    window.requestAnimationFrame(function () {
      els.drawer.focus({ preventScroll: true });
    });

    return true;
  }

  function closeDrawer(options) {
    if (!drawerOpen) return;
    options = options || {};

    drawerOpen = false;
    activeHerbId = null;
    els.drawerRoot.hidden = true;
    els.drawerRoot.setAttribute("aria-hidden", "true");
    els.body.classList.remove("drawer-open");
    document.title = BASE_TITLE;

    if (options.updateHash !== false) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }

    if (options.restoreFocus !== false && lastFocused && document.contains(lastFocused)) {
      try { lastFocused.focus({ preventScroll: true }); } catch (error) { /* noop */ }
    }
    lastFocused = null;
  }

  function syncFromLocation() {
    var raw = window.location.hash.replace(/^#/, "");
    var id = "";
    try { id = decodeURIComponent(raw); } catch (error) { id = raw; }

    if (id && herbMap[id]) {
      if (!drawerOpen || activeHerbId !== id) {
        openHerb(id, { push: false, restoreFocus: false });
      }
    } else if (drawerOpen) {
      closeDrawer({ updateHash: false, restoreFocus: false });
    }
  }

  /* =========================================================
     打印A5药方签
     ========================================================= */

  function buildPrintSheet(herb) {
    var toxic = String(herb.toxicity || "无毒") !== "无毒";
    var primary = (herb.efficacy && herb.efficacy[0]) || "本草";
    var pairs = (herb.pairs || []).map(function (pair) {
      var other = herbMap[pair.id];
      return other ? [other.name, pair.note] : null;
    }).filter(Boolean).slice(0, 1);

    var printFacts = [
      ["学名", herb.latin],
      ["科属", herb.family],
      ["药用部位", herb.part],
      ["性味", (herb.flavors || []).join("、") + " · " + herb.nature],
      ["归经", (herb.meridians || []).join("、")],
      ["毒性", herb.toxicity || "资料待核"]
    ];

    var factsHTML = printFacts.map(function (fact) {
      return [
        '<div class="print-fact">',
        '<dt>', escapeHTML(fact[0]), "</dt>",
        "<dd>", escapeHTML(fact[1]), "</dd>",
        "</div>"
      ].join("");
    }).join("");

    var warning = toxic ? [
      '<div class="print-warning">',
      "<strong>", escapeHTML(herb.toxicity), " · ", escapeHTML(herb.toxAction || "需炮制"), " · 切勿自行使用</strong>",
      "<span>", escapeHTML(herb.toxicNote || "有明确毒性风险，必须由专业人员处理。"), "</span>",
      "</div>"
    ].join("") : [
      '<div class="print-warning" style="border-color:#9F907D;color:#3E372F">',
      "<strong>", herb.specialWarning ? "来源提示" : "创作参考", "</strong>",
      "<span>", escapeHTML(herb.specialWarning || "非处方，不含剂量与配比；不要据此用药。"), "</span>",
      "</div>"
    ].join("");

    var pairHTML = pairs.length ? pairs.map(function (pair) {
      return '<p class="print-pair"><strong>' + escapeHTML(herb.name) + " + " + escapeHTML(pair[0]) + "</strong> · " + escapeHTML(pair[1]) + "</p>";
    }).join("") : '<p class="print-pair">本谱暂未为这一味收录固定药对。</p>';


    return [
      '<article class="print-card">',
      '<header class="print-head">',
      '<div class="print-brand">',
      '<span class="print-seal">草</span>',
      '<div><p class="print-brand-name">草药谱</p><p class="print-brand-sub">HERBAL INDEX</p></div>',
      "</div>",
      '<p class="print-kicker">药方签 / HERB CARD<strong>创作参考，非处方</strong></p>',
      "</header>",

      '<div class="print-hero">',
      "<div>",
      '<p class="print-name">', escapeHTML(herb.name), "</p>",
      '<p class="print-pinyin">', escapeHTML(herb.pinyin || ""), "</p>",
      '<p class="print-latin">', escapeHTML(herb.latin), " · ", escapeHTML(herb.en), "</p>",
      "</div>",
      '<span class="print-stamp">', escapeHTML(primary), "</span>",
      "</div>",

      warning,

      '<dl class="print-facts">', factsHTML,
      '<div class="print-fact is-wide"><dt>保护级别</dt><dd>', escapeHTML(herb.protection || "资料待核"), "</dd></div>",
      "</dl>",

      '<section class="print-section">',
      '<h3 class="print-section-title">功效 / 主治</h3>',
      '<div class="print-pills">', (herb.efficacy || []).map(function (item) {
        return '<span class="print-pill">' + escapeHTML(item) + "</span>";
      }).join(""), "</div>",
      '<p>', escapeHTML((herb.indications || []).join(" · ")), "</p>",
      "</section>",

      '<section class="print-section">',
      '<h3 class="print-section-title">禁忌 / 提示</h3>',
      '<p>', escapeHTML(herb.contraBrief || "资料待核"), "</p>",
      '<p>孕妇：', escapeHTML((herb.contra && herb.contra.pregnancy) || "资料待核"), "</p>",
      '<p>配伍：', escapeHTML((herb.contra && herb.contra.incompat) || "资料待核"), "</p>",
      "</section>",

      '<section class="print-section">',
      '<h3 class="print-section-title">药对</h3>',
      '<div class="print-pairs">', pairHTML, "</div>",
      "</section>",

      '<div class="print-notes">',
      '<h3 class="print-section-title">创作摘记 / NOTES</h3>',
      '<div class="print-note-lines"><span></span><span></span><span></span></div>',
      "</div>",

      '<div class="print-disclaimer">',
      "<strong>创作参考，非处方。</strong>仅用于创作参考，不构成医疗建议；不要据此用药。本站不提供剂量、方剂配比与可服用炮制步骤。",
      "</div>",
      '<div class="print-foot"><span>草药谱 · HERBAL INDEX</span><span>© 2026 Simon Workshop™</span></div>',
      "</article>"
    ].join("");
  }

  function printHerb(herb) {
    if (!herb) return;
    els.printSheet.innerHTML = buildPrintSheet(herb);
    els.printSheet.setAttribute("aria-hidden", "false");
    window.setTimeout(function () {
      window.print();
    }, 60);
  }

  /* =========================================================
     事件绑定
     ========================================================= */

  function bindEvents() {
    if (els.reverseGrid) {
      els.reverseGrid.addEventListener("click", function (event) {
        var button = event.target.closest("[data-tag]");
        if (!button) return;
        var tag = button.getAttribute("data-tag");
        state.reverse = state.reverse === tag ? null : tag;
        state.page = 1;
        renderAll();
      });
    }

    if (els.clearReverse) {
      els.clearReverse.addEventListener("click", function () {
        state.reverse = null;
        state.page = 1;
        renderAll();
      });
    }

    if (els.searchInput) {
      var debounceTimer = null;
      els.searchInput.addEventListener("input", function () {
        window.clearTimeout(debounceTimer);
        debounceTimer = window.setTimeout(function () {
          state.query = els.searchInput.value.trim();
          state.page = 1;
          renderAll();
        }, 90);
      });

      els.searchInput.addEventListener("search", function () {
        if (!els.searchInput.value) {
          state.query = "";
          state.page = 1;
          renderAll();
        }
      });
    }

    if (els.searchClear) {
      els.searchClear.addEventListener("click", function () {
        state.query = "";
        state.page = 1;
        if (els.searchInput) {
          els.searchInput.value = "";
          els.searchInput.focus();
        }
        renderAll();
      });
    }

    if (els.filterBar) {
      els.filterBar.addEventListener("change", function (event) {
        var input = event.target;
        if (!input || input.type !== "checkbox") return;
        var key = input.getAttribute("data-group");
        if (!key) return;
        if (input.checked) addFilter(key, input.value);
        else removeFilter(key, input.value);
        renderAll();
      });
    }

    if (els.activeFilters) {
      els.activeFilters.addEventListener("click", function (event) {
        var button = event.target.closest("[data-remove-group]");
        if (!button) return;
        removeFilter(button.getAttribute("data-remove-group"), button.getAttribute("data-remove-value"));
        renderAll();
      });
    }

    if (els.resetFilters) {
      els.resetFilters.addEventListener("click", resetEverything);
    }

    if (els.emptyReset) {
      els.emptyReset.addEventListener("click", resetEverything);
    }

    if (els.herbGrid) {
      els.herbGrid.addEventListener("click", function (event) {
        var card = event.target.closest(".herb-card");
        if (!card) return;
        openHerb(card.getAttribute("data-id"));
      });

      els.herbGrid.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") return;
        var card = event.target.closest(".herb-card");
        if (!card) return;
        event.preventDefault();
        openHerb(card.getAttribute("data-id"));
      });
    }

    if (els.pagination) {
      els.pagination.addEventListener("click", function (event) {
        var button = event.target.closest("[data-page]");
        if (!button || button.disabled) return;
        setPage(button.getAttribute("data-page"));
        renderResults();
        var target = document.getElementById("resultsTitle");
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    if (els.pairsList) {
      els.pairsList.addEventListener("click", function (event) {
        var button = event.target.closest("[data-herb-id]");
        if (!button) return;
        openHerb(button.getAttribute("data-herb-id"));
      });
    }

    if (els.reverseBanner) {
      els.reverseBanner.addEventListener("click", function (event) {
        if (event.target.closest("[data-clear-reverse]")) {
          state.reverse = null;
          state.page = 1;
          renderAll();
        }
      });
    }

    if (els.randomBtn) {
      els.randomBtn.addEventListener("click", function () {
        var pool = filteredHerbs();
        if (!pool.length) pool = HERBS;
        if (!pool.length) return;
        var candidates = pool.filter(function (herb) { return herb.id !== activeHerbId; });
        if (!candidates.length) candidates = pool;
        var herb = candidates[Math.floor(Math.random() * candidates.length)];
        openHerb(herb.id);
        showToast("随机拉到：「" + herb.name + "」");
      });
    }

    if (els.closeDrawer) els.closeDrawer.addEventListener("click", function () { closeDrawer(); });

    if (els.drawerRoot) {
      els.drawerRoot.addEventListener("click", function (event) {
        if (event.target.closest("[data-close-drawer]")) closeDrawer();
      });
    }

    if (els.drawerContent) {
      els.drawerContent.addEventListener("click", function (event) {
        var pairButton = event.target.closest(".pair-detail[data-herb-id]");
        if (pairButton) {
          openHerb(pairButton.getAttribute("data-herb-id"));
          return;
        }
        if (event.target.closest("[data-print-herb]")) {
          if (activeHerbId) printHerb(herbMap[activeHerbId]);
          return;
        }
      });
    }

    if (els.printBtn) {
      els.printBtn.addEventListener("click", function () {
        if (activeHerbId) printHerb(herbMap[activeHerbId]);
      });
    }

    document.addEventListener("click", function (event) {
      if (!els.filterBar || event.target.closest(".filter-group")) return;
      Array.prototype.forEach.call(els.filterBar.querySelectorAll("details[open]"), function (details) {
        details.open = false;
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        if (drawerOpen) {
          event.preventDefault();
          closeDrawer();
          return;
        }
        var openDetails = els.filterBar ? els.filterBar.querySelector("details[open]") : null;
        if (openDetails) {
          openDetails.open = false;
          return;
        }
        if (document.activeElement === els.searchInput) {
          if (els.searchInput.value) {
            els.searchInput.value = "";
            state.query = "";
            state.page = 1;
            renderAll();
          } else {
            els.searchInput.blur();
          }
        }
        return;
      }

      if (event.key === "/" && !isTypingTarget(event.target) && !drawerOpen) {
        event.preventDefault();
        if (els.searchInput) {
          els.searchInput.focus();
          els.searchInput.select();
        }
        return;
      }

      if (event.key === "Tab" && drawerOpen) {
        var focusables = els.drawer.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    window.addEventListener("popstate", syncFromLocation);
    window.addEventListener("hashchange", syncFromLocation);
  }

  function isTypingTarget(target) {
    if (!target) return false;
    var tag = target.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
  }

  /* =========================================================
     初始化
     ========================================================= */

  function init() {
    renderReverseGrid();
    renderFilters();
    renderPairs();
    updateHeroStats();
    renderAll();
    bindEvents();

    if (window.location.hash) {
      window.setTimeout(syncFromLocation, 0);
    }

    if (HERBS.length) {
      document.documentElement.classList.add("js-ready");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
