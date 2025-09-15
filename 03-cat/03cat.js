document.addEventListener("DOMContentLoaded", () => {
  // ===== 要素参照 =====
  const cards         = Array.from(document.querySelectorAll(".cat-card"));
  const filterButtons = Array.from(document.querySelectorAll(".filter-btn"));
  const keywordInput  = document.getElementById("keyword");
  const ageMinInput   = document.getElementById("ageMin");
  const ageMaxInput   = document.getElementById("ageMax");
  const resetBtn      = document.getElementById("resetFilters");
  const resultNode    = document.getElementById("resultCount");

  // ===== ユーティリティ =====
  const toNumOrNull = (v) => (v === "" || v == null ? null : (Number.isFinite(+v) ? +v : null));
  const textContains = (text, q) => (text || "").toLowerCase().includes((q || "").toLowerCase());
  const debounce = (fn, ms = 250) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; };
  const getActiveValue = (type) => document.querySelector(`.filter-btn.is-active[data-type="${type}"]`)?.dataset.filter ?? "all";
  const prefersReduce  = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

  // ===== フィルタ状態 =====
  const state = { color: null, gender: null, ageMin: null, ageMax: null, keyword: "" };
  state.color  = (getActiveValue("color")  === "all") ? null : getActiveValue("color");
  state.gender = (getActiveValue("gender") === "all") ? null : getActiveValue("gender");
  state.sort = 'default'; // 'default' | 'name-asc' | 'age-asc' | 'age-desc'

  // 各カードに現在の可視状態を覚えさせる（データ属性で真偽管理）
  cards.forEach(card => { card.dataset.visible = "1"; });
  // 元の並び順を保存（デフォルトに戻す用）
  cards.forEach((card, i) => { card.dataset.index = String(i); });

  // ===== 表示/非表示アニメーション =====
  function showCard(card){
    if (prefersReduce){
      card.classList.remove("is-hidden","is-leaving","is-enter","is-enter-active");
      card.style.display = ""; card.dataset.visible = "1";
      return;
    }
    // すでに可視なら何もしない
    if (card.dataset.visible === "1") return;

    // レイアウトに戻す
    card.classList.remove("is-hidden","is-leaving");
    card.style.display = "";

    // フェードイン（enter -> enter-active）
    card.classList.add("is-enter");
    // reflowでトランジションを効かせる
    card.offsetWidth;
    card.classList.add("is-enter-active");

    const onEnd = (e) => {
      if (e.propertyName !== "opacity") return;
      card.classList.remove("is-enter","is-enter-active");
      card.removeEventListener("transitionend", onEnd);
      card.dataset.visible = "1";
    };
    card.addEventListener("transitionend", onEnd);
  }

  function hideCard(card){
    if (prefersReduce){
      card.classList.add("is-hidden");
      card.style.display = "none"; card.dataset.visible = "0";
      card.classList.remove("is-leaving","is-enter","is-enter-active");
      return;
    }
    // すでに不可視なら何もしない
    if (card.dataset.visible === "0") return;

    // フェードアウト（leaving -> hidden）
    card.classList.add("is-leaving");
    const onEnd = (e) => {
      if (e.propertyName !== "opacity") return;
      card.classList.remove("is-leaving");
      card.classList.add("is-hidden");
      card.style.display = "none";
      card.removeEventListener("transitionend", onEnd);
      card.dataset.visible = "0";
    };
    card.addEventListener("transitionend", onEnd);
  }

  // 既存参照
  const resultNumber = document.getElementById("resultNumber");
  const emptyState   = document.getElementById("emptyState");
  const emptyReset   = document.getElementById("emptyReset");

  let lastVisibleCount = null;

  // 件数表示の更新＋ゼロ件メッセージの制御 
  function updateResultCount(count){
    // 引数が来ていればそれを使う。なければ従来どおりdatasetから数える（後方互換）
    const visible = (typeof count === 'number')
    ? count
    : cards.filter(c => c.dataset.visible === "1").length;

    // 数字部分だけをスムーズに更新（ふわっと）
    if (resultNumber) {
      if (lastVisibleCount !== visible) {
        // ちょい演出（縮→戻）
        resultNumber.animate(
          [{ transform: 'scale(0.9)', opacity: 0.6 }, { transform: 'scale(1.0)', opacity: 1 }],
          { duration: 180, easing: 'ease-out' }
        );
      }
      resultNumber.textContent = String(visible);
    }

    // 0件のときだけメッセージを表示
    if (emptyState) emptyState.hidden = visible !== 0;

    lastVisibleCount = visible;
  }

  // 0件メッセージ側の「リセット」ボタン
  emptyReset?.addEventListener('click', () => {
    // 既存のリセットボタンをそのまま動かす
    document.getElementById('resetFilters')?.click();
  });


  // ===== フィルタ適用 =====
  function applyFilters() {
    const showing = [];
    const hiding  = [];

    cards.forEach(card => {
      const { color, gender, age } = card.dataset;
      const ageNum  = Number(age);
      const name    = card.querySelector(".cat-card__name")?.textContent || "";
      const feature = card.querySelector(".cat-card__feature")?.textContent || "";
      const haystack = `${name} ${feature}`;

      const okColor   = !state.color  || state.color === color;
      const okGender  = !state.gender || state.gender === gender;
      const okAgeMin  = state.ageMin === null || (Number.isFinite(ageNum) && ageNum >= state.ageMin);
      const okAgeMax  = state.ageMax === null || (Number.isFinite(ageNum) && ageNum <= state.ageMax);
      const okKeyword = !state.keyword || textContains(haystack, state.keyword);

      (okColor && okGender && okAgeMin && okAgeMax && okKeyword)
        ? showing.push(card)
        : hiding.push(card);
    });

    const wrapper = document.querySelector('.cats__wrapper');
    if (wrapper){
      let sorted = [...showing];

      const byName   = (a,b) => (a.querySelector('.cat-card__name')?.textContent?.trim() || '')
                               .localeCompare(b.querySelector('.cat-card__name')?.textContent?.trim() || '', 'ja');
      const byAgeAsc = (a,b) => (Number(a.dataset.age)||0) - (Number(b.dataset.age)||0);

      switch (state.sort){
        case 'name-asc': sorted.sort(byName); break;
        case 'age-asc':  sorted.sort(byAgeAsc); break;
        case 'age-desc': sorted.sort(byAgeAsc).reverse(); break;
        default:         sorted.sort((a,b)=> (Number(a.dataset.index)||0)-(Number(b.dataset.index)||0));
      }
      sorted.forEach(card => wrapper.appendChild(card));
    }

    // ここでアニメ（show/hide）
    showing.forEach(showCard);
    hiding.forEach(hideCard);

    // 件数
    updateResultCount(showing.length);
  }

  // ===== ボタン（色・性別） =====
  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const { type, filter } = btn.dataset;

      document.querySelectorAll(`.filter-btn[data-type="${type}"]`)
        .forEach(b => b.classList.toggle("is-active", b === btn));

      state[type] = (filter === "all") ? null : filter;
      applyFilters();
    });
  });

  // ===== 年齢 =====
  const onAgeChange = () => {
    state.ageMin = toNumOrNull(ageMinInput?.value);
    state.ageMax = toNumOrNull(ageMaxInput?.value);
    applyFilters();
  };
  ageMinInput?.addEventListener("input", onAgeChange);
  ageMaxInput?.addEventListener("input", onAgeChange);

  // ===== キーワード =====
  const onKeywordInput = debounce(() => {
    state.keyword = keywordInput?.value?.trim() || "";
    applyFilters();
  }, 200);
  keywordInput?.addEventListener("input", onKeywordInput);

  // ===== リセット =====
  resetBtn?.addEventListener("click", () => {
    state.color   = null;
    state.gender  = null;
    state.ageMin  = null;
    state.ageMax  = null;
    state.keyword = "";

    filterButtons.forEach(b => b.classList.remove("is-active"));
    document.querySelector(`.filter-btn[data-type="color"][data-filter="all"]`)?.classList.add("is-active");
    document.querySelector(`.filter-btn[data-type="gender"][data-filter="all"]`)?.classList.add("is-active");

    if (keywordInput) keywordInput.value = "";
    if (ageMinInput)  ageMinInput.value  = "";
    if (ageMaxInput)  ageMaxInput.value  = "";

    applyFilters();
  });

  // 初回適用
  applyFilters();

  // 性別＆毛色タグを自動生成して .cat-card__info の先頭に差し込む 
  (function injectTags(){
    const colorSwatches = {
      "白":    "#f7f7f7",
      "黒":    "#222",
      "白黒":  "linear-gradient(135deg, #fff 49.5%, #222 50.5%)",
      "茶":    "#c58f5b",
      "サビ":  "linear-gradient(135deg, #6b4b3e 50%, #c38b6b 50%)"
    };

    cards.forEach(card => {
      const { color, gender } = card.dataset;
      const info = card.querySelector('.cat-card__info');
      if (!info) return;

      // すでに生成済みなら二重作成を避ける
      if (info.querySelector('.cat-card__tags')) return;

      const tags = document.createElement('div');
      tags.className = 'cat-card__tags';
      tags.setAttribute('aria-label', '猫の属性');

      // 性別バッジ
      if (gender){
        const g = document.createElement('span');
        g.className = 'badge badge--gender';
        g.dataset.gender = gender;
        g.setAttribute('aria-label', `性別: ${gender}`);
        // ♂ / ♀ は視覚用（読み上げは aria-label で十分）
        const icon = document.createElement('span');
        icon.textContent = (gender === 'オス') ? '♂' : '♀';
        icon.setAttribute('aria-hidden', 'true');

        const text = document.createElement('span');
        text.className = 'badge__text';
        text.textContent = gender;

        g.append(icon, text);
        tags.appendChild(g);
      }

      // 毛色バッジ
      if (color){
        const c = document.createElement('span');
        c.className = 'badge badge--color';
        c.setAttribute('aria-label', `毛色: ${color}`);

        const sw = document.createElement('span');
        sw.className = 'badge__swatch';

        // 単色 or グラデ対応
        const swatch = colorSwatches[color];
        if (swatch){
          if (swatch.startsWith('linear-gradient')){
            sw.style.backgroundImage = swatch;
          } else {
            sw.style.background = swatch;
          }
        }

        const text = document.createElement('span');
        text.className = 'badge__text';
        text.textContent = color;

        c.append(sw, text);
        tags.appendChild(c);
      }

      // 情報ブロックの先頭に挿入
      info.prepend(tags);
    });
  })();

  // ===== 画像を遅延読み込み（既存<img>に後付け） =====
  document.querySelectorAll('.cat-card__image').forEach(img => {
    if ('loading' in HTMLImageElement.prototype) {
      img.loading = 'lazy';
    }
  }); 

  // ===== モーダル（HTML差し込み＋イベント） =====
  (function setupModal(){
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-label','猫の詳細');
    modal.innerHTML = `
      <div class="modal__dialog">
        <button class="modal__close" aria-label="閉じる">✕</button>
        <img class="modal__img" alt="">
        <div class="modal__body">
          <h3 class="modal__title"></h3>
          <p class="modal__text"></p>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const btnX  = modal.querySelector('.modal__close');
    const img   = modal.querySelector('.modal__img');
    const title = modal.querySelector('.modal__title');
    const text  = modal.querySelector('.modal__text');

    let lastFocused = null;

    function openFromCard(card){
      // カード情報を取得
      const src   = card.querySelector('.cat-card__image')?.getAttribute('src') || '';
      const alt   = card.querySelector('.cat-card__image')?.getAttribute('alt') || '';
      const name  = card.querySelector('.cat-card__name')?.textContent?.trim() || '';
      const feat  = card.querySelector('.cat-card__feature')?.textContent?.trim() || '';

      img.src = src; img.alt = alt || name;
      title.textContent = name;
      text.textContent  = feat;

      lastFocused = document.activeElement;
      modal.classList.add('is-open');
      document.body.style.overflow = 'hidden'; // 背景スクロール止め
      btnX.focus();
    }

    function close(){
      modal.classList.remove('is-open');
      document.body.style.overflow = '';
      // 少し待ってからフォーカス戻す（アニメ時間と合わせる）
      setTimeout(() => lastFocused?.focus(), 250);
    }

    // カードクリックで開く（画像や本文クリックOK）
    cards.forEach(card => {
      card.style.cursor = 'pointer';
      card.setAttribute('tabindex','0'); // キーボードでも開ける
      card.addEventListener('click', e => {
        // フィルターのボタン等、カード外要素が混ざらないように
        openFromCard(card);
      });
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault(); openFromCard(card);
        }
      });
    });

    // 閉じる操作：×ボタン、背景クリック、Esc
    btnX.addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    window.addEventListener('keydown', e => {
      if (!modal.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
    });
  })();

  // ===== ページ上部へ戻るボタン（HTML差し込み＋動作） =====
  (function setupToTop(){
    const btn = document.createElement('button');
    btn.className = 'to-top';
    btn.setAttribute('aria-label','ページ上部へ戻る');
    btn.innerHTML = '↑';
    document.body.appendChild(btn);

    const onScroll = () => {
      if (window.scrollY > 400) btn.classList.add('is-show');
      else btn.classList.remove('is-show');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  })();

  // ===== ソートUIを後付け（HTML編集不要） =====
  (function injectSortUI(){
    const controls = document.querySelector('.filter__controls');
    if (!controls) return;

    const wrap = document.createElement('div');
    wrap.className = 'filters-group';

    const label = document.createElement('label');
    label.setAttribute('for','sortSelect');
    label.textContent = '並び替え:';

    const select = document.createElement('select');
    select.id = 'sortSelect';
    select.className = 'filter__select';
    select.innerHTML = `
      <option value="default">デフォルト</option>
      <option value="name-asc">名前（あいうえお順）</option>
      <option value="age-asc">年齢（若い→年上）</option>
      <option value="age-desc">年齢（年上→若い）</option>
    `;

    wrap.append(label, select);
    controls.appendChild(wrap);

    // 変更時にstate更新→apply
    select.addEventListener('change', ()=>{
      state.sort = select.value;
      applyFilters();
    });
  })();
});

// 年号の自動反映
document.getElementById('year')?.replaceChildren(String(new Date().getFullYear()));

