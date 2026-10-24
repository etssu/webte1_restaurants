SOURCE_EAT_AND_MEET = "source/eat-and-meet.html";
SOURCE_NASE_HOSPODA = "source/nase-hospoda.html";
SOURCE_RESTAURACIA_DRAG = "source/restauracia-drag.html";

let restaurants = [];
let visibleRestaurants = new Set();
const today = new Date().getDay();
let selectedDay = today === 0 || today === 6 ? 1 : today;
let showWholeWeek = false;

const DAYS_SK = ["Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok"];

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanText(text) {
  return text.replace(/\s+/g, " ").trim();
}

async function loadHtmlJQuery(url) {
  try {
    return await $.ajax({ url: url, dataType: "text" });
  } catch (error) {
    console.error("Nepodarilo sa načítať stránku:", url, error);
    return null;
  }
}

function parseHtml(html) {
  return new DOMParser().parseFromString(html, "text/html");
}

function normalizeMeal(meal) {
  return {
    title: meal.title || "",
    weight: meal.weight || "",
    type: meal.type || "",
    allergens: meal.allergens || "",
    price: meal.price || "",
    image: meal.image || "",
  };
}
function normalizeMenu(day, date, category, meals, title = "") {
  return {
    title: title,
    day: day || "",
    date: date || "",
    category: category || "daily",
    meals: meals.map(normalizeMeal),
  };
}

function getMealCategory(meal) {
  const type = meal.type.toLowerCase();

  if (type.includes("poliev")) {
    return "Polievky";
  }

  return "Hlavné jedlá";
}

function normalizeRestaurant(restaurant, menus, url, address) {
  return {
    restaurant: restaurant,
    menus: menus,
    url: url,
    address: address
  };
}

function normalizeEatAndMeetDay(dayId) {
  const match = dayId.match(/^day-?(\d+)$/i);

  if (!match) return dayId;

  const index = Number(match[1]) - 1;

  return DAYS_SK[index] || dayId;
}

function parseEatAndMeetJQuery(doc) {
  const menus = [];

  $(doc)
    .find(".tab-pane")
    .each((dayIndex, dayElement) => {
      if (dayIndex >= 5) return false;

      const $day = $(dayElement);
      const meals = [];

      $day.find(".menu-body").each((index, element) => {
        const $meal = $(element);
        const $title = $meal.find(".menu-description .desc");

        meals.push({
          title: cleanText(
            $title.clone().children("span").remove().end().text(),
          ),
          type: cleanText($meal.find(".menu-title h4").text()),
          price: cleanText($meal.find(".menu-title .price").text()),
          allergens: cleanText(
            $meal.find(".menu-description .desc span").text(),
          )
            .replace(/[()]/g, "")
            .replace(/\s/g, ""),
          image: $meal.find("img").attr("src"),
        });
      });

      menus.push(
        normalizeMenu(
          normalizeEatAndMeetDay($day.attr("id")),
          "",
          "daily",
          meals,
        ),
      );
    });

  return menus;
}

function parseEatAndMeetCommonMealsJQuery(doc) {
  const commonMeals = [];

  $(doc)
    .find("section.weak-menu.our-menu")
    .each(function () {
      const $section = $(this);

      const previousHeading = cleanText(
        $section.prevAll("section.menu-list-bg").first().find("h2").text(),
      ).toUpperCase();

      const type = previousHeading === "LIVE MENU" ? "Live menu" : "Grill";

      $section.find(".menu-body").each(function () {
        const $meal = $(this);
        const title = cleanText($meal.find("h5").text());
        const match = title.match(/\(([\d,\s]+)\)\s*$/);

        commonMeals.push({
          title: cleanText(title.replace(/\s*\([\d,\s]+\)\s*$/, "")),
          type: type,
          price: cleanText($meal.find(".price").text()),
          allergens: match ? match[1].replace(/\s/g, "") : "",
          image: $meal.find("img").attr("src"),
        });
      });
    });

  return [normalizeMenu("", "", "common", commonMeals)];
}

function parseNaseHospodaJQuery(doc) {
  const menus = [];

  $(doc)
    .find("article")
    .each((dayIndex, dayElement) => {
      if (dayIndex > 5) return false;
      const $day = $(dayElement);
      const meals = [];

      const dayName = cleanText($day.find("div.tracking-wider").text());
      const date = cleanText($day.find("div.text-white").first().text());

      if (!dayName || !date) {
        return;
      }

      $day.find(".flex.gap-4.py-4").each((index, element) => {
        const $meal = $(element);

        const $title = $meal.find(".min-w-0 .font-bold.text-hospoda-cream");
        const weight = cleanText($title.find("span").text());
        const title = cleanText(
          $title.clone().children("span").remove().end().text(),
        );
        const $type = $meal.find(".mt-1.flex.flex-wrap");
        const type = cleanText($type.find("span").eq(0).text());
        const allergens = cleanText(
          $meal.find(".mt-1.text-xs.text-zinc-400").text(),
        )
          .replace(/^.*?Alergény:\s*/i, "")
          .replace(/[()\s]/g, "");

        meals.push({
          title: title,
          weight: weight,
          type: type,
          allergens: allergens,
          price: cleanText($meal.find(".shrink-0.text-hospoda-cream").text()),
        });
      });

      const formattedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
      menus.push(normalizeMenu(formattedDay, date, "daily", meals));
    });

  return menus;
}

function parseNaseHospodaSpecialJQuery(doc) {
  const meals = [];

  const $article = $(doc)
    .find("article")
    .filter(function () {
      return (
        cleanText($(this).find("h3").first().text()) === "Týždenný špeciál"
      );
    })
    .first();

  $article.find(".flex.gap-4.py-4").each(function () {
    const $meal = $(this);
    const $title = $meal.find(".min-w-0 .font-bold.text-hospoda-cream");

    const weight = cleanText($title.find("span").first().text());
    const title = cleanText(
      $title.clone().children("span").remove().end().text(),
    );
    const allergens = cleanText(
      $meal.find(".mt-1.text-xs.text-zinc-400").text(),
    )
      .replace(/^Alergény:\s*/i, "")
      .replace(/[()\s]/g, "");
    const price = cleanText(
      $meal.find(".shrink-0.font-bold.text-hospoda-cream").text(),
    );

    meals.push({
      title: title,
      type: "Týždenný špeciál",
      weight: weight,
      allergens: allergens,
      price: price,
    });
  });

  return [normalizeMenu("", "", "special", meals, "Týždenný špeciál")];
}

function parseRestauraciaDragJQuery(doc) {
  const menus = [];

  const dayNames = {
    pondelok: "Pondelok",
    utorok: "Utorok",
    streda: "Streda",
    stvrtok: "Štvrtok",
    piatok: "Piatok",
  };

  $(doc)
    .find(".tab-pane[id]")
    .each(function () {
      const $day = $(this);
      const dayName = dayNames[$day.attr("id")];

      if (!dayName) {
        return;
      }

      const meals = [];
      const $soupHeading = $day
        .find(".menu_box_title h3")
        .filter(function () {
          return cleanText($(this).text()).toUpperCase() === "POLIEVKA";
        })
        .first();

      if ($soupHeading.length) {
        let soupText = "";

        $soupHeading
          .parent()
          .nextAll()
          .each(function () {
            if ($(this).is(".menu_box_title")) {
              return false;
            }

            soupText += " " + $(this).text();
          });

        // Text may also be a sibling text node, outside any element.
        const heading = $soupHeading.parent()[0];
        let node = heading.nextSibling;

        while (
          node &&
          !(node.nodeType === 1 && $(node).hasClass("menu_box_title"))
        ) {
          soupText += " " + (node.textContent || "");
          node = node.nextSibling;
        }

        soupText = cleanText(soupText);

        const parts = soupText.match(/([\d,.]+\s*l)\s*(.*?)\s*\/([\d,\s]+)\//i);

        if (parts) {
          meals.push({
            title: cleanText(parts[2]).replace(/^[.\s]+/, ""),
            weight: cleanText(parts[1]),
            type: "Polievka",
            allergens: parts[3].replace(/[()\s]/g, ""),
            price: "",
          });
        }
      }

      // Main dishes
      $day.find("table tr").each(function () {
        const $cells = $(this).children("td");
        const rawTitle = cleanText($cells.eq(0).text());
        const price = cleanText($cells.eq(1).text());

        if (!rawTitle || !price) {
          return;
        }

        const allergensMatch = rawTitle.match(/\/([\d,\s]+)\//);
        const weightMatch = rawTitle.match(
          /^\d+(?:,\d+)?\s*(?:g|kg|ml|l)(?:\s*\/\s*\d+(?:,\d+)?\s*g)?/i,
        );

        meals.push({
          title: cleanText(
            rawTitle
              .replace(/\/([\d,\s]+)\//, "")
              .replace(
                /^\d+(?:,\d+)?\s*(?:g|kg|ml|l)(?:\s*\/\s*\d+(?:,\d+)?\s*g)?\s*/i,
                "",
              ),
          ),
          weight: weightMatch ? cleanText(weightMatch[0]) : "",
          type: "Hlavné jedlo",
          allergens: allergensMatch
            ? allergensMatch[1].replace(/[()\s]/g, "")
            : "",
          price: price,
        });
      });

      menus.push(normalizeMenu(dayName, "", "daily", meals));
    });

  return menus;
}

function createMealCard(meal) {
  const card = $("<article>").addClass("meal-card card mb-3");

  $("<span>").addClass("meal-card-type").text(meal.type).appendTo(card);

  $("<h3>").addClass("meal-card-title h2").text(meal.title).appendTo(card);

  if (meal.weight) {
    $("<p>").addClass("meal-card-details").text(meal.weight).appendTo(card);
  }

  $("<p>").addClass("meal-card-price").text(meal.price).appendTo(card);

  if (meal.allergens) {
    $("<p>")
      .addClass("meal-card-allergens")
      .text(`Alergény: ${meal.allergens}`)
      .appendTo(card);
  }
  return card;
}


function renderMenus(restaurant, menus, wholeWeek = false) {
  const container = $("#meals-container");

  let block = container.find(
    `[data-restaurant="${restaurant.restaurant}"]`
  );

  if (!block.length) {
    block = $("<section>")
      .addClass("restaurant-menu")
      .attr("data-restaurant", restaurant.restaurant);

    $("<h2>")
      .addClass("restaurant-menu-title")
      .text(restaurant.restaurant)
      .appendTo(block);

    container.append(block);
  }

  block.empty();
  const hasMeals = menus.some(
    menu => menu.meals && menu.meals.length > 0
  );

  if (!hasMeals) {
    $("<p>")
      .addClass("menu-unavailable")
      .text("Menu na tento deň nie je k dispozícii.")
      .appendTo(block);

    return;
  }

  $("<h2>")
    .addClass("restaurant-menu-title")
    .text(restaurant.restaurant)
    .appendTo(block);

  const dailyMenus = menus.filter(menu => menu.category === "daily");
  const commonMenus = menus.filter(menu => menu.category === "common");
  const specialMenus = menus.filter(menu => menu.category === "special");

  function renderCategory(title, meals) {
    if (!meals.length) return;

    const section = $("<section>").addClass("menu-category");

    $("<h3>")
      .addClass("menu-category-title")
      .text(title)
      .appendTo(section);

    const grid = $("<div>").addClass("meals-grid");

    meals.forEach(meal => grid.append(createMealCard(meal)));

    section.append(grid);
    block.append(section);
  }

  dailyMenus.forEach(menu => {
    const prefix = wholeWeek ? `${menu.day} — ` : "";

    renderCategory(
      `${prefix}Polievky`,
      menu.meals.filter(meal => getMealCategory(meal) === "Polievky")
    );

    renderCategory(
      `${prefix}Hlavné jedlá`,
      menu.meals.filter(meal => getMealCategory(meal) === "Hlavné jedlá")
    );
  });

  commonMenus.forEach(menu => {
    renderCategory(menu.title || "Grill a Live menu", menu.meals);
  });

  specialMenus.forEach(menu => {
    renderCategory(menu.title || "Týždenný špeciál", menu.meals);
  });
}

function formatLastUpdated(lastUpdated) {
  if (!lastUpdated) {
    return "Čas aktualizácie nie je dostupný";
  }

  const date = new Date(lastUpdated);

  if (Number.isNaN(date.getTime())) {
    return "Čas aktualizácie nie je dostupný";
  }

  return date.toLocaleString("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderRestaurants(restaurants) {
  const container = $("#restaurants-container");
  container.empty();

  restaurants.forEach((restaurant, index) => {
    const card = $(`
    <div class="col-12 col-md-4">
      <div class="restaurant-option">
        <button type="button"
          class="restaurant-card w-100"
          aria-pressed="false">
          <h3 class="h5 mb-0"></h3>
        </button>
        <a class="restaurant-link"
          target="_blank"
          rel="noopener noreferrer">
          Oficiálna stránka ↗
        </a>
        <p class="restaurant-address">
          <span aria-hidden="true">📍</span>
          <span class="address-text"></span>
        </p>
      </div>
    </div>
  `);

    card.find("h3").text(restaurant.restaurant);
    card.find(".restaurant-link").attr("href", restaurant.url);
    card.find(".address-text").text(restaurant.address);
    $("<p>")
    .addClass("restaurant-updated")
    .text(`Posledná aktualizácia: ${formatLastUpdated(restaurant.lastUpdated)}`)
    .appendTo(card.find(".restaurant-option"));

    card.find("button")
    .attr("data-restaurant-index", index)
    .toggleClass("active", visibleRestaurants.has(restaurant.restaurant))
    .attr("aria-pressed", String(visibleRestaurants.has(restaurant.restaurant)));

    container.append(card);
  });

  container
    .off("click", ".restaurant-card")
    .on("click", ".restaurant-card", function () {
      const index = Number($(this).attr("data-restaurant-index"));
      const name = restaurants[index].restaurant;

      if (visibleRestaurants.has(name)) {
        visibleRestaurants.delete(name);
      } else {
        visibleRestaurants.add(name);
      }

      const isVisible = visibleRestaurants.has(name);

      $(this)
        .toggleClass("active", isVisible)
        .attr("aria-pressed", String(isVisible));

      selectDay(selectedDay);
    });
}


function selectDay(dayNumber) {
  $("#meals-container").empty();

  const dayButtons = $("#day-selector .day-button")
    .not("#week-view-toggle");

  const selectedButton = dayButtons.filter(
    `[data-day="${dayNumber}"]`
  );

  const day = selectedButton.text().trim();

  restaurants
    .filter(restaurant => visibleRestaurants.has(restaurant.restaurant))
    .forEach(restaurant => {
      let menus;

      if (showWholeWeek) {
        menus = restaurant.menus.filter(menu =>
          DAYS_SK.includes(menu.day) ||
          menu.category === "common" ||
          menu.category === "special"
        );
      } else {
        menus = restaurant.menus.filter(menu =>
          menu.day === day ||
          menu.category === "common" ||
          menu.category === "special"
        );
      }

    renderMenus(restaurant, menus, showWholeWeek);
  });
}

function getTodayKey() {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function loadCachedRestaurants() {
  const savedData = localStorage.getItem("restaurantMenus");

  if (!savedData) return null;

  try {
    const cached = JSON.parse(savedData);

    if (cached.date !== getTodayKey()) return null;

    return cached.restaurants;
  } catch (error) {
    return null;
  }
}

function saveCachedRestaurants(restaurants) {
  const now = new Date().toISOString();

  const updatedRestaurants = restaurants.map(restaurant => ({
    ...restaurant,
    lastUpdated: now,
  }));

  localStorage.setItem(
    "restaurantMenus",
    JSON.stringify({
      date: getTodayKey(),
      restaurants: updatedRestaurants,
    })
  );

  return updatedRestaurants;
}


async function main() {
  const startTime = Date.now();
  $("#menu-loading").prop("hidden", false);

  try {
    const cachedRestaurants = loadCachedRestaurants();

    if (cachedRestaurants) {
      restaurants = cachedRestaurants;
    } else {
      const results = await Promise.allSettled([
        loadHtmlJQuery(SOURCE_EAT_AND_MEET),
        loadHtmlJQuery(SOURCE_NASE_HOSPODA),
        loadHtmlJQuery(SOURCE_RESTAURACIA_DRAG),
      ]);

      const sourceNames = [
        "Eat & Meet",
        "Naše Hospoda",
        "Reštaurácia Drag",
      ];

      const htmlResults = results.map((result, index) => {
        if (result.status === "rejected") {
          console.error(
            `Nepodarilo sa načítať HTML pre ${sourceNames[index]}.`,
            result.reason
          );
          return "";
        }

        return result.value || "";
      });

      const [htmlEAM, htmlNH, htmlRD] = htmlResults;

      const docEAM = parseHtml(htmlEAM || "");
      const docNH = parseHtml(htmlNH || "");
      const docRD = parseHtml(htmlRD || "");

      const restaurantEAM = normalizeRestaurant(
        "Eat & Meet",
        [
          ...parseEatAndMeetJQuery(docEAM),
          ...parseEatAndMeetCommonMealsJQuery(docEAM),
        ],
        "https://eatandmeet.sk/",
        "Staré Grunty 36, 841 04 Bratislava-Karlova Ves"
      );

      const restaurantNH = normalizeRestaurant(
        "Naše Hospoda",
        [
          ...parseNaseHospodaJQuery(docNH),
          ...parseNaseHospodaSpecialJQuery(docNH),
        ],
        "https://www.nasehospoda-karloveska.sk/",
        "Segnerova 3, 841 04 Bratislava - Karlova Ves"
      );

      const restaurantRD = normalizeRestaurant(
        "Reštaurácia Drag",
        parseRestauraciaDragJQuery(docRD),
        "https://www.restauracia-drag.sk/restauracia-drag",
        "Staré Grunty 64, 841 04 Bratislava - Karlova Ves"
      );

      restaurants = saveCachedRestaurants([
        restaurantEAM,
        restaurantNH,
        restaurantRD,
      ]);
    }

    visibleRestaurants = new Set(
      restaurants.map(restaurant => restaurant.restaurant)
    );

    renderRestaurants(restaurants);

    $("#day-selector")
      .off("click", ".day-button:not(#week-view-toggle)")
      .on("click", ".day-button:not(#week-view-toggle)", function () {
        selectedDay = Number($(this).attr("data-day"));
        showWholeWeek = false;

        $("#week-view-toggle")
          .removeClass("active")
          .attr("aria-pressed", "false");

        $("#day-selector .day-button").removeClass("active");
        $(this).addClass("active");

        selectDay(selectedDay);
      });

    $(`#day-selector .day-button[data-day="${selectedDay}"]`)
      .addClass("active");

    $("#week-view-toggle")
      .off("click")
      .on("click", function () {
        showWholeWeek = !showWholeWeek;

        $(this)
          .toggleClass("active", showWholeWeek)
          .attr("aria-pressed", String(showWholeWeek));

        if (showWholeWeek) {
          $("#day-selector .day-button")
            .not("#week-view-toggle")
            .removeClass("active");
        } else {
          $("#day-selector .day-button").removeClass("active");

          $(`#day-selector .day-button[data-day="${selectedDay}"]`)
            .addClass("active");
        }

        selectDay(selectedDay);
      });

    selectDay(selectedDay);

    console.log(restaurants);

    return restaurants;
  } catch (error) {
    console.error(
      "Nepodarilo sa načítať alebo spracovať menu:",
      error
    );
  } finally {
    const elapsed = Date.now() - startTime;
    await delay(Math.max(0, 2000 - elapsed));

    $("#menu-loading").prop("hidden", true);
  }
}

$("#menu-toggle").on("click", function () {
  $("#main-nav").toggleClass("open");

  const isOpen = $("#main-nav").hasClass("open");

  $(this).attr("aria-expanded", String(isOpen));
});

$("#refresh-menu").on("click", async function () {
  $("#menu-loading").prop("hidden", false);
  $(this).prop("disabled", true);

  try {
    localStorage.removeItem("restaurantMenus");
    await main();
  } finally {
    $("#menu-loading").prop("hidden", true);
    $(this).prop("disabled", false);
  }
});

$("#clear-menu-cache").on("click", function () {
  localStorage.removeItem("restaurantMenus");
  $("#meals-container").empty();

  alert("Uložené dáta boli vymazané.");
});

main();
