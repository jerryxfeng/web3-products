// Constants
const CONFIG = {
  CSV_URL:
    "https://docs.google.com/spreadsheets/d/1YkJ7VEeP1RT4PGS2D_X9S4i0L9FT_KLeC-UKVVv5nbo/pub?output=csv",
  SUBMIT_FORM_URL: "https://tally.so/r/wgLJAN",
  FALLBACK_IMAGE: "https://web3-products.vercel.app/sydney.jpg",
  APPROVED_COLUMN_INDEX: 13,
  DEGODS_PROJECT_COLUMN_INDEX: 12,
  S_TIER_COLUMN_INDEX: 14,
  NEW_PRODUCT_COLUMN_INDEX: 15,
  DEBOUNCE_DELAY: 300,
  MOBILE_BREAKPOINT: 768,
};

// State
let allProducts = [];

// Utility Functions
const debounce = (func, delay) => {
  let debounceTimer;
  return (...args) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => func.apply(this, args), delay);
  };
};

const sanitizeHTML = (str) => {
  const temp = document.createElement("div");
  temp.textContent = str;
  return temp.innerHTML;
};

const formatUrl = (url) => {
  if (!url) return "";
  try {
    const { hostname, pathname } = new URL(url);
    const domain = hostname.replace(/^www\./, "");
    return pathname && pathname !== "/" ? `${domain}${pathname}` : domain;
  } catch (e) {
    return url.replace(/^https?:\/\//, "").split("/")[0];
  }
};

const extractTwitterUsername = (url) => {
  if (!url) return null;
  const { pathname } = new URL(url);
  return pathname.split("/").filter(Boolean)[0];
};

// CSV Parsing Functions
const parseCSVRow = (row) => {
  const result = [];
  let inQuotes = false;
  let value = "";

  for (const char of row) {
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
};

const parseCSV = (data) => {
  const rows = data.split("\n").slice(1); // Skip header row
  return rows
    .map((row) => {
      const cols = parseCSVRow(row);
      if (cols && cols[CONFIG.APPROVED_COLUMN_INDEX].toLowerCase() === "yes") {
        const isDeGodsProject =
          cols[CONFIG.DEGODS_PROJECT_COLUMN_INDEX].toLowerCase() === "yes";
        const isSTier =
          cols[CONFIG.S_TIER_COLUMN_INDEX].toLowerCase() === "yes";
        const isNewProduct =
          cols[CONFIG.NEW_PRODUCT_COLUMN_INDEX]?.toLowerCase() === "yes";

        return {
          submissionId: cols[0],
          respondentId: cols[1],
          submittedAt: new Date(cols[2]),
          productName: sanitizeHTML(cols[3]?.replace(/^"|"$/g, "") || ""),
          productDescription: sanitizeHTML(
            cols[4]?.replace(/^"|"$/g, "") || ""
          ),
          productCategory:
            cols[5]
              ?.split(",")
              .map((tag) => sanitizeHTML(tag.trim().replace(/^"|"$/g, ""))) ||
            [],
          productBlockchain:
            cols[6]
              ?.split(",")
              .map((chain) =>
                sanitizeHTML(chain.trim().replace(/^"|"$/g, ""))
              ) || [],
          productWebsite: sanitizeHTML(cols[7]?.replace(/^"|"$/g, "") || ""),
          productTwitter: sanitizeHTML(cols[8]?.replace(/^"|"$/g, "") || ""),
          founderTwitter: sanitizeHTML(cols[11]?.replace(/^"|"$/g, "") || ""),
          productLogo: encodeURI(cols[10]?.replace(/^"|"$/g, "") || ""),
          isDeGodsProject,
          isSTier,
          isNewProduct,
        };
      }
      return null;
    })
    .filter(Boolean);
};

// Display Functions
const createProductElement = (product) => {
  const productDiv = document.createElement("div");
  productDiv.classList.add("product-list-item");
  productDiv.addEventListener("click", () =>
    window.open(product.productWebsite, "_blank")
  );

  const logoImg = createProductLogo(product);
  if (logoImg) productDiv.appendChild(logoImg);

  const infoDiv = createProductInfo(product);
  productDiv.appendChild(infoDiv);

  return productDiv;
};

const createProductLogo = (product) => {
  if (!product.productLogo) return null;

  const logo = document.createElement("img");
  logo.src = product.productLogo;
  logo.loading = "lazy";
  logo.onerror = () => {
    logo.src = CONFIG.FALLBACK_IMAGE;
  };
  logo.alt = `${product.productName} logo`;
  logo.classList.add("product-logo");

  return logo;
};

const createProductInfo = (product) => {
  const infoDiv = document.createElement("div");
  infoDiv.classList.add("product-info");

  const nameDescriptionDiv = document.createElement("div");
  nameDescriptionDiv.classList.add("name-description-founder");

  const titleRow = createTitleRow(product);
  nameDescriptionDiv.appendChild(titleRow);

  const descriptionFounderContent = createDescriptionFounderContent(product);
  nameDescriptionDiv.appendChild(descriptionFounderContent);

  infoDiv.appendChild(nameDescriptionDiv);

  const metaDiv = createMetaDiv(product);
  infoDiv.appendChild(metaDiv);

  const websiteAndTwitterDiv = createWebsiteAndTwitterDiv(product);
  infoDiv.appendChild(websiteAndTwitterDiv);

  return infoDiv;
};

const createTitleRow = (product) => {
  const titleRow = document.createElement("div");
  titleRow.classList.add("product-title-row");

  const nameSpan = document.createElement("span");
  nameSpan.classList.add("product-name");
  nameSpan.textContent = product.productName;
  titleRow.appendChild(nameSpan);

  if (product.isDeGodsProject) {
    const deGodsBadge = document.createElement("img");
    deGodsBadge.src = "https://web3-products.vercel.app/degods.png";
    deGodsBadge.alt = "DeGods Project";
    deGodsBadge.classList.add("degods-badge");
    titleRow.appendChild(deGodsBadge);
  }

  return titleRow;
};

const createDescriptionFounderContent = (product) => {
  const descriptionFounderContent = document.createElement("span");
  descriptionFounderContent.classList.add("product-description-founder");

  const descriptionSpan = document.createElement("span");
  descriptionSpan.classList.add("product-description");

  const desktopDescription = document.createElement("span");
  desktopDescription.textContent = ` - ${product.productDescription.trim()}`;
  desktopDescription.style.display = "none";
  descriptionSpan.appendChild(desktopDescription);

  const mobileDescription = document.createElement("span");
  mobileDescription.textContent = product.productDescription.trim();
  mobileDescription.style.display = "none";
  descriptionSpan.appendChild(mobileDescription);

  descriptionFounderContent.appendChild(descriptionSpan);

  if (product.founderTwitter) {
    const username = extractTwitterUsername(product.founderTwitter);
    if (username) {
      const founderSpan = document.createElement("span");
      founderSpan.classList.add("founder-info");
      founderSpan.innerHTML = `, built by <span class="clickable-tag">@${username}</span>`;
      const founderLink = founderSpan.querySelector(".clickable-tag");
      founderLink.addEventListener("click", (e) => {
        e.stopPropagation();
        window.open(product.founderTwitter, "_blank");
      });
      descriptionFounderContent.appendChild(founderSpan);
    }
  }

  return descriptionFounderContent;
};

const createMetaDiv = (product) => {
  const metaDiv = document.createElement("div");
  metaDiv.classList.add("product-meta");

  // Build the meta string with blockchain, new product and S-tier emojis
  let metaText = `${product.productCategory.join(" · ")} · ${
    product.productBlockchain.length > 1
      ? "multichain"
      : product.productBlockchain.join(", ")
  }`;

  if (product.isNewProduct) {
    metaText += " · 🆕";
  }
  if (product.isSTier) {
    metaText += " · 😍";
  }

  metaDiv.textContent = metaText;

  return metaDiv;
};

const createWebsiteAndTwitterDiv = (product) => {
  const websiteAndTwitterDiv = document.createElement("div");
  websiteAndTwitterDiv.classList.add("product-meta");
  websiteAndTwitterDiv.innerHTML = `
    <a href="${
      product.productWebsite
    }" class="clickable-tag" target="_blank">${formatUrl(
    product.productWebsite
  )}</a>
  `;

  if (product.productTwitter) {
    const twitterIcon = document.createElement("img");
    twitterIcon.src = "https://web3-products.vercel.app/twitter.svg";
    twitterIcon.alt = "Twitter";
    twitterIcon.classList.add("twitter-icon");
    twitterIcon.addEventListener("click", (e) => {
      e.stopPropagation();
      window.open(product.productTwitter, "_blank");
    });
    websiteAndTwitterDiv.appendChild(twitterIcon);
  }

  return websiteAndTwitterDiv;
};

const displayProducts = (products) => {
  const container = document.getElementById("product-container");
  container.innerHTML = "";
  products.forEach((product) => {
    container.appendChild(createProductElement(product));
  });
  handleLayoutChange(); // Add this line to update the layout after displaying products
};

// Filter and Sort Functions
const populateFilterOptions = (products) => {
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

  const createCheckbox = (value, parentElement, className) => {
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
  };

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
};

const applyFiltersAndSorting = () => {
  const isMobile = window.innerWidth < CONFIG.MOBILE_BREAKPOINT;
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
  const showDeGodsOnly = document.getElementById(
    isMobile ? "mobileProductToggle" : "desktopProductToggle"
  ).checked;
  const showNewProducts = document.getElementById(
    isMobile ? "mobileNewProductToggle" : "desktopNewProductToggle"
  ).checked;

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
    const deGodsMatch = showDeGodsOnly
      ? product.isDeGodsProject
      : product.isSTier;
    const newProductMatch = showNewProducts ? true : !product.isNewProduct;
    return categoryMatch && blockchainMatch && deGodsMatch && newProductMatch;
  });

  if (sortBy === "alphabetical") {
    filteredProducts.sort((a, b) => a.productName.localeCompare(b.productName));
  } else if (sortBy === "recent") {
    filteredProducts.sort((a, b) => b.submittedAt - a.submittedAt);
  }

  displayProducts(filteredProducts);
};

// Mobile-specific functions
const toggleMobileFilterSection = () => {
  const filterSection = document.querySelector(".mobile-filter-section");
  filterSection.style.display =
    filterSection.style.display === "none" ? "block" : "none";
};

const handleResponsiveLayout = () => {
  const isMobile = window.innerWidth < CONFIG.MOBILE_BREAKPOINT;
  const mobileFilterSection = document.querySelector(".mobile-filter-section");
  const sidebar = document.querySelector(".sidebar");

  mobileFilterSection.style.display = isMobile ? "none" : "none";
  sidebar.style.display = isMobile ? "none" : "block";
};

const handleLayoutChange = () => {
  const isMobile = window.innerWidth <= CONFIG.MOBILE_BREAKPOINT;
  const desktopDescriptions = document.querySelectorAll(
    ".product-description span:first-child"
  );
  const mobileDescriptions = document.querySelectorAll(
    ".product-description span:last-child"
  );

  desktopDescriptions.forEach((desc) => {
    desc.style.display = isMobile ? "none" : "inline";
  });

  mobileDescriptions.forEach((desc) => {
    desc.style.display = isMobile ? "inline" : "none";
  });
};

// Event Listeners
const addEventListeners = () => {
  document
    .getElementById("submitButton")
    .addEventListener("click", () =>
      window.open(CONFIG.SUBMIT_FORM_URL, "_blank")
    );
  document
    .getElementById("mobileSubmitButton")
    .addEventListener("click", () =>
      window.open(CONFIG.SUBMIT_FORM_URL, "_blank")
    );
  document
    .getElementById("mobileFilterButton")
    .addEventListener("click", toggleMobileFilterSection);

  const filterElements = [
    "categoryFilter",
    "blockchainFilter",
    "sortFilter",
    "desktopCategoryFilter",
    "desktopBlockchainFilter",
    "desktopSortFilter",
  ];
  filterElements.forEach((id) => {
    document
      .getElementById(id)
      .addEventListener(
        "change",
        debounce(applyFiltersAndSorting, CONFIG.DEBOUNCE_DELAY)
      );
  });

  document
    .getElementById("mobileProductToggle")
    .addEventListener("change", applyFiltersAndSorting);
  document
    .getElementById("desktopProductToggle")
    .addEventListener("change", applyFiltersAndSorting);
  document
    .getElementById("mobileNewProductToggle")
    .addEventListener("change", applyFiltersAndSorting);
  document
    .getElementById("desktopNewProductToggle")
    .addEventListener("change", applyFiltersAndSorting);

  window.addEventListener(
    "resize",
    debounce(handleResponsiveLayout, CONFIG.DEBOUNCE_DELAY)
  );
  window.addEventListener("load", handleLayoutChange);
  window.addEventListener("resize", handleLayoutChange);
};

// Initialize
const init = async () => {
  try {
    const response = await fetch(CONFIG.CSV_URL);
    const data = await response.text();
    allProducts = parseCSV(data);

    // Set the default state for the toggle to "Products we ❤️"
    document.getElementById("desktopProductToggle").checked = false;
    document.getElementById("mobileProductToggle").checked = false;

    populateFilterOptions(allProducts);
    applyFiltersAndSorting();
    handleResponsiveLayout();
    handleLayoutChange(); // Add this line to ensure correct initial layout
    addEventListeners();
  } catch (error) {
    console.error("Error fetching CSV data:", error);
  }
};

// Start the application
init();
