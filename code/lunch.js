function doGet() {
    const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>급식표 슬라이더</title>
  <style>
    body {
      margin: 0;
      font-family: sans-serif;
      background: #fff;
    }

    #slider-controls {
      text-align: center;
      padding: 16px 0;
      background: #fff;
      box-shadow: 0 1px 4px rgba(0,0,0,0.1);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    #slider-controls button {
      font-size: 1.5rem;
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px 12px;
    }
    #slider-controls button:disabled {
      opacity: 0.3;
      cursor: default;
    }

    /* 메인 컨테이너 */
    #lunch-container {
      display: flex;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      padding: 16px;
      box-sizing: border-box;
      scroll-behavior: smooth;
    }
    #lunch-container::-webkit-scrollbar {
      display: none;
    }

    /* 각 날짜별 박스 */
    .meal-box {
      flex: 0 0 100%;
      scroll-snap-align: start;
      margin-right: 16px;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 5px 30px 12px;
      background: #fafafa;
      box-sizing: border-box;
      min-width: 0;
    }

    .detail-meal-box {
      display: flex;
      margin: 4px 0;
    }
    .meal-period {
      width: 60px;
      flex-shrink: 0;
      font-weight: bold;
    }
    .menu-text {
      flex: 1;
      line-height: 1.4em;
      white-space: pre-line;
    }

    .error {
      color: red;
      text-align: center;
      margin: 2em 0;
    }
  </style>
</head>
<body>

  <div id="slider-controls">
    <button id="prev-btn">◀</button>
    <button id="next-btn">▶</button>
  </div>

  <div id="lunch-container">로딩 중…</div>
  <div id="error" class="error"></div>

  <script>
    /* 날짜 포맷 (템플릿 리터럴 대신 문자열 연결 사용) */
    function formatKorean(yyyymmdd) {
      var y = +yyyymmdd.slice(0,4);
      var m = +yyyymmdd.slice(4,6) - 1;
      var d = +yyyymmdd.slice(6,8);
      var dt = new Date(y, m, d);
      var w = ["일","월","화","수","목","금","토"];
      return (m + 1) + "월 " + d + "일 " + w[dt.getDay()] + "요일";
    }

    /* 버튼 활성/비활성 업데이트 */
    function updateButtons(container, prevBtn, nextBtn) {
      prevBtn.disabled = container.scrollLeft <= 0;
      nextBtn.disabled = container.scrollLeft + container.clientWidth >= container.scrollWidth - 2;
    }

    /* 슬라이드 관련 */
    var currentIndex = 0;
    function getSlides() {
      return Array.prototype.slice.call(document.querySelectorAll(".meal-box"));
    }

    function goToSlide(index) {
      var container = document.getElementById("lunch-container");
      var slides = getSlides();
      if (index < 0 || index >= slides.length) return;

      currentIndex = index;
      container.scrollTo({
        left: slides[index].offsetLeft,
        behavior: "smooth"
      });
    }

    /* DOM 로딩 */
    document.addEventListener("DOMContentLoaded", function () {
      var container = document.getElementById("lunch-container");
      var errorBox  = document.getElementById("error");
      var prevBtn   = document.getElementById("prev-btn");
      var nextBtn   = document.getElementById("next-btn");

      prevBtn.addEventListener("click", function () { goToSlide(currentIndex - 1); });
      nextBtn.addEventListener("click", function () { goToSlide(currentIndex + 1); });

      container.addEventListener("scroll", function () {
        updateButtons(container, prevBtn, nextBtn);
      });

      /* 서버에서 급식 데이터 로딩 */
      google.script.run.withSuccessHandler(function (responseText) {
        try {
          var data = JSON.parse(responseText);
          var rows = data.mealServiceDietInfo && data.mealServiceDietInfo[1] && data.mealServiceDietInfo[1].row;
          if (!rows) throw new Error("급식 정보가 없습니다.");

          var days = [];
          rows.forEach(function(item) {
            var found = days.find(function(x) { return x.ymd === item.MLSV_YMD; });
            var d;
            if (!found) {
              d = { ymd: item.MLSV_YMD };
              days.push(d);
            } else {
              d = found;
            }
            var t = item.MMEAL_SC_NM ? item.MMEAL_SC_NM.trim() : "";
            if (t === "조식") d.breakfast = item.DDISH_NM;
            else if (t === "중식") d.lunch = item.DDISH_NM;
            else if (t === "석식") d.dinner = item.DDISH_NM;
          });

          days.sort(function(a,b){ return a.ymd.localeCompare(b.ymd); });

          container.innerHTML = "";
          days.forEach(function(d) {
            var html = '<div class="meal-box">';
            html += '<h1>' + formatKorean(d.ymd) + '</h1>';
            if (d.breakfast) {
              html += '<div class="detail-meal-box"><span class="meal-period">조식</span><span class="menu-text">' + d.breakfast + '</span></div>';
            }
            if (d.lunch) {
              html += '<div class="detail-meal-box"><span class="meal-period">중식</span><span class="menu-text">' + d.lunch + '</span></div>';
            }
            if (d.dinner) {
              html += '<div class="detail-meal-box"><span class="meal-period">석식</span><span class="menu-text">' + d.dinner + '</span></div>';
            }
            html += '</div>';
            container.insertAdjacentHTML("beforeend", html);
          });

          /* 처음 로드 후 버튼 상태 업데이트 (슬라이드 생긴 뒤) */
          setTimeout(function() { updateButtons(container, prevBtn, nextBtn); }, 50);
        } catch (e) {
          container.innerHTML = "";
          errorBox.textContent = e.message;
        }
      }).getMealData();
    });
  </script>
</body>
</html>
  `;
    return HtmlService.createHtmlOutput(html)
        .setTitle("급식표 슬라이더")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


/* ------------------------------
   서버 측: NEIS API 호출
--------------------------------*/
function getMealData() {
    const now = new Date();
    const from = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const to = new Date(from);
    to.setDate(to.getDate() + 20);

    const format = d => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    };

    const url = "https://open.neis.go.kr/hub/mealServiceDietInfo"
        + "?Type=json"
        + "&KEY=f1c23612b62a42308870c8ab469a16e8"
        + "&ATPT_OFCDC_SC_CODE=I10"
        + "&SD_SCHUL_CODE=9300219"
        + `&MLSV_FROM_YMD=${format(from)}`
        + `&MLSV_TO_YMD=${format(to)}`;

    const response = UrlFetchApp.fetch(url);
    return response.getContentText();
}