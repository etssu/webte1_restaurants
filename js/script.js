SOURCE_EAT_AND_MEET= "source/eat-and-meet.html"
SOURCE_NASE_HOSPODA = "source/nase-hospoda.html"
SOURCE_RESTAURACIA_DRAG = "source/restauracia-drag.html"

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

    console.log(restaurants);

    return restaurants;
  } catch (error) {
    console.error(
      "Nepodarilo sa načítať alebo spracovať menu:",
      error
    );
  }
}

main();