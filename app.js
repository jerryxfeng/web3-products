// Constants
const CSV_URL =
  "https://docs.google.com/spreadsheets/d/1YkJ7VEeP1RT4PGS2D_X9S4i0L9FT_KLeC-UKVVv5nbo/pub?output=csv";
const SUBMIT_FORM_URL = "https://tally.so/r/wgLJAN";
const FALLBACK_IMAGE = "sydney.jpg";
const APPROVED_COLUMN_INDEX = 12;
const DEBOUNCE_DELAY = 300; // milliseconds
const MOBILE_BREAKPOINT = 768; // pixels

let allProducts = [];

// Utility Functions
const debounce = (func, delay) => {
  let debounceTimer;
  return function () {
    const context = this;
    const args = arguments;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => func.apply(context, args), delay);
  };
};

const sanitizeHTML = (str) => {
  const temp = document.createElement("div");
  temp.textContent = str;
  return temp.innerHTML;
};

// CSV Parsing Functions
function parseCSVRow(row) {
  const result = [];
  let inQuotes = false;
  let value = "";

  for (let char of row) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(value.trim());
      value = "";
    } else {
      value += char;
    }
  }

  result.push(value.trim());
  return result;
}

function parseCSV(data) {
  const rows = data.split("\n").slice(1); // Skip header row
  return rows
    .map((row) => {
      const cols = parseCSVRow(row);
      if (cols && cols[APPROVED_COLUMN_INDEX].toLowerCase() === "yes") {
        return {
          submissionId: cols[0],
          respondentId: cols[1],
          submittedAt: new Date(cols[2]),
          productName: sanitizeHTML(
            cols[3] ? cols[3].replace(/^"|"$/g, "") : ""
          ),
          productDescription: sanitizeHTML(
            cols[4] ? cols[4].replace(/^"|"$/g, "") : ""
          ),
          productCategory: cols[5]
            ? cols[5]
                .split(",")
                .map((tag) => sanitizeHTML(tag.trim().replace(/^"|"$/g, "")))
            : [],
          productBlockchain: cols[6]
            ? cols[6]
                .split(",")
                .map((chain) =>
                  sanitizeHTML(chain.trim().replace(/^"|"$/g, ""))
                )
            : [],
          productWebsite: sanitizeHTML(
            cols[7] ? cols[7].replace(/^"|"$/g, "") : ""
          ),
          productTwitter: sanitizeHTML(
            cols[8] ? cols[8].replace(/^"|"$/g, "") : ""
          ),
          founderTwitter: sanitizeHTML(
            cols[11] ? cols[11].replace(/^"|"$/g, "") : ""
          ),
          productLogo: encodeURI(
            cols[10] ? cols[10].replace(/^"|"$/g, "") : ""
          ),
        };
      }
      return null;
    })
    .filter((product) => product !== null);
}

// Display Functions
function extractTwitterUsername(url) {
  if (!url) return null;
  const urlObj = new URL(url);
  return urlObj.pathname.split("/").filter(Boolean)[0];
}

function cleanUrl(url) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function createProductElement(product) {
  const productDiv = document.createElement("div");
  productDiv.classList.add("product-list-item");
  productDiv.addEventListener("click", () => {
    window.open(product.productWebsite, "_blank");
  });

  // Product Logo
  if (product.productLogo) {
    const logo = document.createElement("img");
    logo.src = product.productLogo;
    logo.loading = "lazy";
    logo.onerror = () => {
      logo.src = FALLBACK_IMAGE;
    };
    logo.alt = `${product.productName} logo`;
    logo.classList.add("product-logo");
    productDiv.appendChild(logo);
  }

  // Product Info
  const infoDiv = document.createElement("div");
  infoDiv.classList.add("product-info");

  // Name and Description
  const nameAndDescription = document.createElement("div");
  nameAndDescription.innerHTML = `
    <span class="product-name">${product.productName}</span>
    <span class="product-description"> – ${product.productDescription}</span>
  `;

  // Founder Twitter
  if (product.founderTwitter) {
    const username = extractTwitterUsername(product.founderTwitter);
    if (username) {
      nameAndDescription.innerHTML += `
        <span>, built by </span>
        <span class="clickable-tag">@${username}</span>
      `;
      const founderLink = nameAndDescription.querySelector(".clickable-tag");
      founderLink.addEventListener("click", (e) => {
        e.stopPropagation();
        window.open(product.founderTwitter, "_blank");
      });
    }
  }

  infoDiv.appendChild(nameAndDescription);

  // Categories and Blockchains
  const metaDiv = document.createElement("div");
  metaDiv.classList.add("product-meta");
  metaDiv.textContent = `${product.productCategory.join(" · ")} · ${
    product.productBlockchain.length > 1
      ? "multichain"
      : product.productBlockchain.join(", ")
  }`;
  infoDiv.appendChild(metaDiv);

  // Website and Twitter
  const websiteAndTwitterDiv = document.createElement("div");
  websiteAndTwitterDiv.classList.add("product-meta");
  websiteAndTwitterDiv.innerHTML = `
    <a href="${
      product.productWebsite
    }" class="clickable-tag" target="_blank">${cleanUrl(
    product.productWebsite
  )}</a>
  `;

  if (product.productTwitter) {
    const twitterIcon = document.createElement("img");
    twitterIcon.src = "twitter.svg";
    twitterIcon.alt = "Twitter";
    twitterIcon.classList.add("twitter-icon");
    twitterIcon.addEventListener("click", (e) => {
      e.stopPropagation();
      window.open(product.productTwitter, "_blank");
    });
    websiteAndTwitterDiv.appendChild(twitterIcon);
  }

  infoDiv.appendChild(websiteAndTwitterDiv);
  productDiv.appendChild(infoDiv);

  return productDiv;
}

function displayProducts(products) {
  const container = document.getElementById("product-container");
  container.innerHTML = "";
  products.forEach((product) => {
    container.appendChild(createProductElement(product));
  });
}

// Filter and Sort Functions
function populateFilterOptions(products) {
  const categoryFilter = document.getElementById("categoryFilter");
  const blockchainFilter = document.getElementById("blockchainFilter");
  const desktopCategoryFilter = document.getElementById(
    "desktopCategoryFilter"
  );
  const desktopBlockchainFilter = document.getElementById(
    "desktopBlockchainFilter"
  );

  const categories = new Set();
  const blockchains = new Set();

  products.forEach((product) => {
    product.productCategory.forEach((category) => categories.add(category));
    product.productBlockchain.forEach((blockchain) =>
      blockchains.add(blockchain)
    );
  });

  function createCheckbox(value, parentElement, className) {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = value;
    checkbox.id = `${className}-${value}`;
    checkbox.classList.add(className);

    const label = document.createElement("label");
    label.htmlFor = `${className}-${value}`;
    label.textContent = value;

    const container = document.createElement("div");
    container.appendChild(checkbox);
    container.appendChild(label);

    parentElement.appendChild(container);
  }

  categories.forEach((category) => {
    createCheckbox(category, categoryFilter, "category-checkbox");
    createCheckbox(
      category,
      desktopCategoryFilter,
      "desktop-category-checkbox"
    );
  });
  blockchains.forEach((blockchain) => {
    createCheckbox(blockchain, blockchainFilter, "blockchain-checkbox");
    createCheckbox(
      blockchain,
      desktopBlockchainFilter,
      "desktop-blockchain-checkbox"
    );
  });
}

function applyFiltersAndSorting() {
  const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
  const selectedCategories = Array.from(
    document.querySelectorAll(
      isMobile
        ? ".category-checkbox:checked"
        : ".desktop-category-checkbox:checked"
    )
  ).map((checkbox) => checkbox.value);
  const selectedBlockchains = Array.from(
    document.querySelectorAll(
      isMobile
        ? ".blockchain-checkbox:checked"
        : ".desktop-blockchain-checkbox:checked"
    )
  ).map((checkbox) => checkbox.value);
  const sortBy = document.getElementById(
    isMobile ? "sortFilter" : "desktopSortFilter"
  ).value;

  let filteredProducts = allProducts.filter((product) => {
    const categoryMatch =
      selectedCategories.length === 0 ||
      product.productCategory.some((category) =>
        selectedCategories.includes(category)
      );
    const blockchainMatch =
      selectedBlockchains.length === 0 ||
      product.productBlockchain.some((blockchain) =>
        selectedBlockchains.includes(blockchain)
      );
    return categoryMatch && blockchainMatch;
  });

  if (sortBy === "alphabetical") {
    filteredProducts.sort((a, b) => a.productName.localeCompare(b.productName));
  } else if (sortBy === "recent") {
    filteredProducts.sort((a, b) => b.submittedAt - a.submittedAt);
  }

  displayProducts(filteredProducts);
}

// Mobile-specific functions
function toggleMobileFilterSection() {
  const filterSection = document.querySelector(".mobile-filter-section");
  if (
    filterSection.style.display === "none" ||
    filterSection.style.display === ""
  ) {
    filterSection.style.display = "block";
  } else {
    filterSection.style.display = "none";
  }
}

function handleResponsiveLayout() {
  const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
  const mobileFilterSection = document.querySelector(".mobile-filter-section");
  const sidebar = document.querySelector(".sidebar");

  if (isMobile) {
    mobileFilterSection.style.display = "none";
    sidebar.style.display = "none";
  } else {
    mobileFilterSection.style.display = "none";
    sidebar.style.display = "block";
  }
}

// Event Listeners
document.getElementById("submitButton").addEventListener("click", () => {
  window.open(SUBMIT_FORM_URL, "_blank");
});

document.getElementById("mobileSubmitButton").addEventListener("click", () => {
  window.open(SUBMIT_FORM_URL, "_blank");
});

document
  .getElementById("mobileFilterButton")
  .addEventListener("click", toggleMobileFilterSection);

document
  .getElementById("categoryFilter")
  .addEventListener("change", debounce(applyFiltersAndSorting, DEBOUNCE_DELAY));
document
  .getElementById("blockchainFilter")
  .addEventListener("change", debounce(applyFiltersAndSorting, DEBOUNCE_DELAY));
document
  .getElementById("sortFilter")
  .addEventListener("change", debounce(applyFiltersAndSorting, DEBOUNCE_DELAY));

document
  .getElementById("desktopCategoryFilter")
  .addEventListener("change", debounce(applyFiltersAndSorting, DEBOUNCE_DELAY));
document
  .getElementById("desktopBlockchainFilter")
  .addEventListener("change", debounce(applyFiltersAndSorting, DEBOUNCE_DELAY));
document
  .getElementById("desktopSortFilter")
  .addEventListener("change", debounce(applyFiltersAndSorting, DEBOUNCE_DELAY));

window.addEventListener(
  "resize",
  debounce(handleResponsiveLayout, DEBOUNCE_DELAY)
);

// Initialize
async function init() {
  try {
    const response = await fetch(CSV_URL);
    const data = await response.text();
    allProducts = parseCSV(data);
    populateFilterOptions(allProducts);
    applyFiltersAndSorting();
    handleResponsiveLayout();
  } catch (error) {
    console.error("Error fetching CSV data:", error);
  }
}

init();
