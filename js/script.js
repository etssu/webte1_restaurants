SOURCE_EAT_AND_MEET= "source/eat-and-meet.html"
SOURCE_NASE_HOSPODA = "source/nase-hospoda.html"
SOURCE_RESTAURACIA_DRAG = "source/restauracia-drag.html"

let selectedRestaurant = null;
let selectedDay = 1;

const DAYS_SK = [
  "Pondelok",
  "Utorok",
  "Streda",
  "Štvrtok",
  "Piatok"
];

function cleanText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function loadHtmlJQuery(url) {
  return $.ajax({url: url, dataType: "text"});
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
    image: meal.image || ""
  };
}
function normalizeMenu(day, date, category, meals, title="") {
  return {
    title: title,
    day: day || "",
    date: date || "",
    category: category || "daily",
    meals: meals.map(normalizeMeal)
  };
}

function getMealCategory(meal) {
  const type = meal.type.toLowerCase();

  if (type.includes("poliev")) {
    return "Polievky";
  }

  return "Hlavné jedlá";
}

function normalizeRestaurant(restaurant, menus) {
  return {
    restaurant: restaurant,
    menus: menus
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

  $(doc).find(".tab-pane").each((dayIndex, dayElement) => {
    if (dayIndex >= 5) return false;

    const $day = $(dayElement);
    const meals = [];

    $day.find(".menu-body").each((index, element) => {
      const $meal = $(element);
      const $title = $meal.find(".menu-description .desc");

      meals.push({
        title: cleanText($title.clone().children("span").remove().end().text()),
        type: cleanText($meal.find(".menu-title h4").text()),
        price: cleanText($meal.find(".menu-title .price").text()),
        allergens: cleanText($meal.find(".menu-description .desc span").text()).replace(/[()]/g, "").replace(/\s/g, ""),
        image: $meal.find("img").attr("src")
      });
    });

    menus.push(
      normalizeMenu(
        normalizeEatAndMeetDay($day.attr("id")),
        "",
        "daily",
        meals
      ))
  });

  return menus;
}

function parseEatAndMeetCommonMealsJQuery(doc) {
  const commonMeals = [];

  $(doc).find("section.weak-menu.our-menu")
  .find(".menu-body").each(function () {
      const $meal = $(this);
      const title = cleanText($meal.find("h5").text());
      const match = title.match(/\(([\d,\s]+)\)\s*$/);

      commonMeals.push({
        title: cleanText(title.replace(/\s*\([\d,\s]+\)\s*$/, "")),
        price: cleanText($meal.find(".price").text()),
        allergens: match ? match[1].replace(/\s/g, "") : "",
        image: $meal.find("img").attr("src")
      });
    });

  return [
    normalizeMenu("", "", "common", commonMeals)
  ];
}


function parseNaseHospodaJQuery(doc) {
  const menus = [];

  $(doc).find("article").each((dayIndex, dayElement) => {
    if (dayIndex > 5) return false;
    const $day = $(dayElement);
    const meals = [];

    const dayName = cleanText($day.find("div.tracking-wider").text());
    const date = cleanText($day.find("div.text-white").first().text());

    if (!dayName || !date){
      return;
    }

    $day.find(".flex.gap-4.py-4").each((index, element) => {
      const $meal = $(element);

      const $title = $meal.find(".min-w-0 .font-bold.text-hospoda-cream");
      const weight = cleanText($title.find("span").text());
      const title = cleanText(
        $title.clone().children("span").remove().end().text()
      );
      const $type = $meal.find(".mt-1.flex.flex-wrap");
      const type = cleanText($type.find("span").eq(0).text());
      const allergens = cleanText(
        $meal.find(".mt-1.text-xs.text-zinc-400").text()
      ).replace(/^.*?Alergény:\s*/i, "").replace(/[()\s]/g, "");

      meals.push({
        title: title,
        weight: weight,
        type: type,
        allergens: allergens,
        price: cleanText($meal.find(".shrink-0.text-hospoda-cream").text())
      });

    });

    const formattedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    menus.push(
      normalizeMenu(formattedDay, date, "daily", meals)
    );
    
  });

  return menus;
}

function parseNaseHospodaSpecialJQuery(doc) {
  const meals = [];

  const $article = $(doc).find("article")
    .filter(function () {
      return cleanText($(this).find("h3").first().text()) ===
        "Týždenný špeciál";
    })
    .first();

  $article.find(".flex.gap-4.py-4").each(function () {
    const $meal = $(this);
    const $title = $meal.find(
      ".min-w-0 .font-bold.text-hospoda-cream"
    );

    const weight = cleanText($title.find("span").first().text());
    const title = cleanText(
      $title.clone().children("span").remove().end().text()
    );
    const allergens = cleanText(
      $meal.find(".mt-1.text-xs.text-zinc-400").text()
    ).replace(/^Alergény:\s*/i, "").replace(/[()\s]/g, "");
    const price = cleanText(
      $meal.find(".shrink-0.font-bold.text-hospoda-cream").text()
    );

    meals.push({
      title: title,
      weight: weight,
      allergens: allergens,
      price: price
    });
  });

  return [
    normalizeMenu("","","special",meals,"Týždenný špeciál")
  ];
}


function parseRestauraciaDragJQuery(doc) {
  const menus = [];

  const dayNames = {
    pondelok: "Pondelok",
    utorok: "Utorok",
    streda: "Streda",
    stvrtok: "Štvrtok",
    piatok: "Piatok"
  };

  $(doc).find(".tab-pane[id]").each(function () {

    
    const $day = $(this);
    const dayName = dayNames[$day.attr("id")]

    if (!dayName) {
      return;
    }

    const meals = [];
    const $soupHeading = $day.find(".menu_box_title h3").filter(function () {
      return cleanText($(this).text()).toUpperCase() === "POLIEVKA";
    }).first();

    if ($soupHeading.length) {
      let soupText = "";

      $soupHeading.parent().nextAll().each(function () {
        if ($(this).is(".menu_box_title")) {
          return false;
        }

        soupText += " " + $(this).text();
      });

      // Text may also be a sibling text node, outside any element.
      const heading = $soupHeading.parent()[0];
      let node = heading.nextSibling;

      while (node && !(node.nodeType === 1 && $(node).hasClass("menu_box_title"))) {
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
          price: ""
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
        /^\d+(?:,\d+)?\s*(?:g|kg|ml|l)(?:\s*\/\s*\d+(?:,\d+)?\s*g)?/i
      );

      meals.push({
        title: cleanText(
          rawTitle
            .replace(/\/([\d,\s]+)\//, "")
            .replace(/^\d+(?:,\d+)?\s*(?:g|kg|ml|l)(?:\s*\/\s*\d+(?:,\d+)?\s*g)?\s*/i, "")
        ),
        weight: weightMatch ? cleanText(weightMatch[0]) : "",
        type: "Hlavné jedlo",
        allergens: allergensMatch ? allergensMatch[1].replace(/[()\s]/g, "") : "",
        price: price
      });
    });

    menus.push(
      normalizeMenu(dayName, "", "daily", meals)
    );
  });

  return menus;
}

function createMealCard(meal) {
  const card = $("<article>").addClass("meal-card card p-3 mb-3");

  $("<span>").addClass("meal-card-type").text(meal.type).appendTo(card);

  $("<h3>").addClass("meal-card-title").text(meal.title).appendTo(card);

  if (meal.weight){
    $("<p>").addClass("meal-card-details").text(meal.weight).appendTo(card);
  }

    $("<p>").addClass("meal-card-price").text(meal.price).appendTo(card);

  if (meal.allergens){
    $("<p>").addClass("meal-card-allergens").text(`Alergény: ${meal.allergens}`).appendTo(card);
  }
  return card;

}

function renderMenus(menus) {
  const container = $("#meals-container");
  container.empty();

  const meals = menus.flatMap(menu => menu.meals);

  const categories = {
    "Polievky": [],
    "Hlavné jedlá": []
  };

  meals.forEach(meal => {
    const category = getMealCategory(meal);
    categories[category].push(meal);
  });

  Object.entries(categories).forEach(([category, categoryMeals]) => {
    if (categoryMeals.length === 0) {
      return;
    }

    const section = $("<section>").addClass("menu-category");

    $("<h2>")
      .addClass("menu-category-title")
      .text(category)
      .appendTo(section);

    const grid = $("<div>").addClass("meals-grid");

    categoryMeals.forEach(meal => {
      const card = createMealCard(meal);

      grid.append(card);
    });

    section.append(grid);
    container.append(section);
  });
}



function renderRestaurants(restaurants){
  const container = $("#restaurants-container");
  container.empty();

  restaurants.forEach((restaurant, index) => {

    const card = $(`
      <div class="col-12 col-md-4">
        <button type="button" class="restaurant-card w-100 h-100">
          <h3 class="h5 mb-0"></h3>
        </button>
      </div>
    `);

    card.find("h3").text(restaurant.restaurant);
    card.find("button").attr("data-restaurant-index", index);

    if (index === 0) {
      card.find("button").addClass("active");
    }

    container.append(card);
  });

  container.off("click", ".restaurant-card").on("click", ".restaurant-card", function () {
    const index = $(this).attr("data-restaurant-index");
    selectedRestaurant = restaurants[index];
    selectDay(selectedDay);

    $(".restaurant-card").removeClass("active");
    $(this).addClass("active");

    console.log("Selected restaurant:", selectedRestaurant.restaurant);
    console.log("Available menus:", selectedRestaurant.menus);
  });

}

function selectDay(dayNumber) {
  if (!selectedRestaurant) {
    console.log("Najprv vyberte reštauráciu.");
    return;
  }

  const dayButtons = $("#day-selector .day-button");
  const selectedButton = dayButtons.filter(`[data-day="${dayNumber}"]`);
  const day = selectedButton.text().trim();

  const menus = selectedRestaurant.menus.filter(menu => menu.day === day);
  renderMenus(menus);

  console.log("Selected day:", day);
  console.log("Menus for selected day:", menus);
}


async function main() {
  try {
    const [htmlEAM, htmlNH, htmlRD] = await Promise.all([
      loadHtmlJQuery(SOURCE_EAT_AND_MEET),
      loadHtmlJQuery(SOURCE_NASE_HOSPODA),
      loadHtmlJQuery(SOURCE_RESTAURACIA_DRAG)
    ]);

    const docEAM = parseHtml(htmlEAM);
    const docNH = parseHtml(htmlNH);
    const docRD = parseHtml(htmlRD);

    const restaurantEAM = normalizeRestaurant(
      "Eat & Meet",
      [
        ...parseEatAndMeetJQuery(docEAM),
        ...parseEatAndMeetCommonMealsJQuery(docEAM)
      ]
    );

    const restaurantNH = normalizeRestaurant(
      "Naše Hospoda",
      [
        ...parseNaseHospodaJQuery(docNH),
        ...parseNaseHospodaSpecialJQuery(docNH)
      ]
    );

    const restaurantRD = normalizeRestaurant(
      "Reštaurácia Drag",
      parseRestauraciaDragJQuery(docRD)
    );

    const restaurants = [
      restaurantEAM,
      restaurantNH,
      restaurantRD
    ];

    renderRestaurants(restaurants);
    selectedRestaurant = restaurants[0];
    selectDay(selectedDay);


    $("#day-selector")
    .off("click", ".day-button")
    .on("click", ".day-button", function () {
      selectedDay = Number($(this).attr("data-day"));

      $("#day-selector .day-button").removeClass("active");
      $(this).addClass("active");

      selectDay(selectedDay);
    });

    $("#day-selector .day-button[data-day='1']").addClass("active");
    selectDay(selectedDay);

    console.log(restaurants);

    return restaurants;
  } catch (error) {
    console.error(
      "Nepodarilo sa načítať alebo spracovať menu:",
      error
    );
  }
}

$(document).ready(function () {
    $("#menu-toggle").on("click", function () {
        $("#main-nav").toggleClass("open");

        const isOpen = $("#main-nav").hasClass("open");
        $(this).attr("aria-expanded", String(isOpen));
    });
});

main();