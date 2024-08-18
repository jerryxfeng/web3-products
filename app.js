// URL of the published Google Sheet CSV
const csvUrl =
  "https://docs.google.com/spreadsheets/d/1YkJ7VEeP1RT4PGS2D_X9S4i0L9FT_KLeC-UKVVv5nbo/pub?output=csv";

let allProducts = [];

// Function to manually parse CSV rows into an array of columns
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

  result.push(value.trim()); // Add the last value
  return result;
}

// Function to parse CSV data properly
function parseCSV(data) {
  const rows = data.split("\n").slice(1); // Skip header row
  return rows
    .map((row) => {
      const cols = parseCSVRow(row);
      if (cols) {
        return {
          submissionId: cols[0],
          submittedAt: new Date(cols[2]), // Parse submitted at time as a date
          productName: cols[3] ? cols[3].replace(/^"|"$/g, "") : "",
          productDescription: cols[4] ? cols[4].replace(/^"|"$/g, "") : "",
          productCategory: cols[5]
            ? cols[5].split(",").map((tag) => tag.trim().replace(/^"|"$/g, ""))
            : [],
          productBlockchain: cols[6]
            ? cols[6]
                .split(",")
                .map((chain) => chain.trim().replace(/^"|"$/g, ""))
            : [],
          productWebsite: cols[7] ? cols[7].replace(/^"|"$/g, "") : "",
          productTwitter: cols[8] ? cols[8].replace(/^"|"$/g, "") : "",
          founderTwitter: cols[9] ? cols[9].replace(/^"|"$/g, "") : "",
          productLogo: cols[10]
            ? encodeURI(cols[10].replace(/^"|"$/g, ""))
            : "",
        };
      }
      return null;
    })
    .filter((product) => product !== null);
}

// Function to extract the Twitter username from a URL
function extractTwitterUsername(url) {
  if (!url) return null;
  const urlObj = new URL(url);
  return urlObj.pathname.split("/").filter(Boolean)[0]; // Get the username part after the last '/'
}

// Function to remove 'https://' and trailing slash from URLs for display
function cleanUrl(url) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

// Function to display products on the page
function displayProducts(products) {
  const container = document.getElementById("product-container");
  container.innerHTML = ""; // Clear previous products
  products.forEach((product) => {
    const productDiv = document.createElement("div");
    productDiv.classList.add("product-list-item");

    // Open product website on click
    productDiv.addEventListener("click", () => {
      window.open(product.productWebsite, "_blank");
    });

    // Product Logo
    if (product.productLogo) {
      const logo = document.createElement("img");
      logo.src = product.productLogo;
      logo.onerror = () => {
        logo.src = "sydney.jpg"; // Fallback image
      };
      logo.alt = `${product.productName} logo`;
      logo.classList.add("product-logo");
      productDiv.appendChild(logo);
    }

    // Product Info
    const infoDiv = document.createElement("div");
    infoDiv.classList.add("product-info");

    // Name and Description in one line
    const nameAndDescription = document.createElement("div");
    const name = document.createElement("span");
    name.textContent = product.productName;
    name.classList.add("product-name");

    const description = document.createElement("span");
    description.textContent = ` – ${product.productDescription}`;
    description.classList.add("product-description");

    nameAndDescription.appendChild(name);
    nameAndDescription.appendChild(description);

    // Add Founder Twitter if available
    if (product.founderTwitter) {
      const username = extractTwitterUsername(product.founderTwitter);
      if (username) {
        const founderLink = document.createElement("span");
        founderLink.classList.add("clickable-tag");
        founderLink.textContent = ` - built by @${username}`;
        founderLink.addEventListener("click", (e) => {
          e.stopPropagation();
          window.open(product.founderTwitter, "_blank");
        });
        nameAndDescription.appendChild(founderLink);
      }
    }

    infoDiv.appendChild(nameAndDescription);

    // Product Categories and Blockchains
    const metaDiv = document.createElement("div");
    metaDiv.classList.add("product-meta");

    const categories = product.productCategory.join(" · ");
    const blockchains =
      product.productBlockchain.length > 1
        ? "multichain"
        : product.productBlockchain.join(", ");

    metaDiv.textContent = `${categories} · ${blockchains}`;
    infoDiv.appendChild(metaDiv);

    // Product Website and Twitter Icon
    const websiteAndTwitterDiv = document.createElement("div");
    websiteAndTwitterDiv.classList.add("product-meta");

    const websiteLink = document.createElement("a");
    websiteLink.href = product.productWebsite;
    websiteLink.textContent = cleanUrl(product.productWebsite);
    websiteLink.classList.add("clickable-tag");
    websiteLink.target = "_blank";

    websiteAndTwitterDiv.appendChild(websiteLink);

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
    container.appendChild(productDiv);
  });
}

// Function to populate filter options with checkboxes
function populateFilterOptions(products) {
  const categoryFilter = document.getElementById("categoryFilter");
  const blockchainFilter = document.getElementById("blockchainFilter");

  const categories = new Set();
  const blockchains = new Set();

  products.forEach((product) => {
    product.productCategory.forEach((category) => categories.add(category));
    product.productBlockchain.forEach((blockchain) =>
      blockchains.add(blockchain)
    );
  });

  categories.forEach((category) => {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = category;
    checkbox.id = `category-${category}`;
    checkbox.classList.add("category-checkbox");

    const label = document.createElement("label");
    label.htmlFor = `category-${category}`;
    label.textContent = category;

    const container = document.createElement("div");
    container.appendChild(checkbox);
    container.appendChild(label);

    categoryFilter.appendChild(container);
  });

  blockchains.forEach((blockchain) => {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = blockchain;
    checkbox.id = `blockchain-${blockchain}`;
    checkbox.classList.add("blockchain-checkbox");

    const label = document.createElement("label");
    label.htmlFor = `blockchain-${blockchain}`;
    label.textContent = blockchain;

    const container = document.createElement("div");
    container.appendChild(checkbox);
    container.appendChild(label);

    blockchainFilter.appendChild(container);
  });
}

// Function to apply filters and sorting
function applyFiltersAndSorting() {
  const selectedCategories = Array.from(
    document.querySelectorAll(".category-checkbox:checked")
  ).map((checkbox) => checkbox.value);
  const selectedBlockchains = Array.from(
    document.querySelectorAll(".blockchain-checkbox:checked")
  ).map((checkbox) => checkbox.value);
  const sortBy = document.getElementById("sortFilter").value;

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

  // Apply sorting
  if (sortBy === "alphabetical") {
    filteredProducts = filteredProducts.sort((a, b) =>
      a.productName.localeCompare(b.productName)
    );
  } else if (sortBy === "recent") {
    filteredProducts = filteredProducts.sort(
      (a, b) => b.submittedAt - a.submittedAt
    );
  }

  displayProducts(filteredProducts);
}

// Event listener for the "Submit" button
document.getElementById("submitButton").addEventListener("click", () => {
  window.open("https://tally.so/r/wgLJAN", "_blank");
});

// Fetch the CSV data and display products
fetch(csvUrl)
  .then((response) => response.text())
  .then((data) => {
    allProducts = parseCSV(data);
    populateFilterOptions(allProducts);
    applyFiltersAndSorting(); // Display products after sorting
  })
  .catch((error) => console.error("Error fetching CSV data:", error));

// Add event listeners to filters and sorting
document
  .getElementById("categoryFilter")
  .addEventListener("change", applyFiltersAndSorting);
document
  .getElementById("blockchainFilter")
  .addEventListener("change", applyFiltersAndSorting);
document
  .getElementById("sortFilter")
  .addEventListener("change", applyFiltersAndSorting);
