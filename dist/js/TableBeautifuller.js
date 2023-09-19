/**
 * TableBeautifuller
 * 
 * Author: Fabacks
 * License: Free distribution except for commercial use
 * GitHub Repository: https://github.com/Fabacks/TableBeautifuller
 * Version 0.8.0
 * 
 * This software is provided "as is" without any warranty. The author is
 * not responsible for any damages or liabilities caused by the use of this software.
 * Please do not use this software for commercial purposes without explicit permission from the author.
 * If you use or distribute this software, please credit the author and link back to the GitHub repository.
 */


class TableBeautifuller {
    constructor(tableId, options = {}) {
        this.table = document.querySelector(tableId);

        // Display
        this.displayBloc = {};
        this.displayBloc.info = options.info ?? true;
        this.displayBloc.ordering = options.ordering ?? true;
        this.displayBloc.paging = options.paging ?? true;
        this.displayBloc.searching = options.searching ?? true;
        this.displayBloc.columnSearch = options.columnSearch ?? true;

        // Initialisation du trie par défaut
        let orderString = options.order || this.table.getAttribute("data-order");
        if (typeof orderString === "string") {
            this.initialOrder = JSON.parse(orderString);
        } else if (Array.isArray(orderString)) {
            this.initialOrder = orderString;
        } else {
            this.initialOrder = [];
        }

        // Initialisation des valeurs pour la pagination (nombre item par page)
        this.pageLength = options.pageLength || parseInt(this.table.getAttribute("data-page-length")) || 10;
        this.currentPage = 1;

        // Initialisation du nombre d'item par page dans le selector
        this.selectItemPage = options.selectItemPage || [10, 20, 30];
        if (!this.selectItemPage.includes(this.pageLength)) {
            this.selectItemPage.push(this.pageLength);
            this.selectItemPage.sort((a, b) => a - b);
        }

        // Initialisation du debounce
        this.debounce_delai = options.debounceDelai || 300;

        this.createWrappers();

        if (this.displayBloc.searching ) {
            this.addSearchInput();
        }

        if (this.displayBloc.ordering) {
            this.addSortingArrows();
            this.applyInitialOrder();
        }

        if (this.displayBloc.columnSearch) {
            this.addSearchColumn();
        }

        if (this.displayBloc.info) {
            this.addInfoControls();
        }

        if (this.displayBloc.paging) {
            this.addPaginationControls();
            this.paginate();
        }

    }

    createWrappers() {
        // Ajout de la classe "tableBeautifuller" à la table
        this.table.classList.add('tableBeautifuller');

        // Création du wrapper "pagination-wrapper-top-container" au dessus du tableau
        this.paginationWrapperTopContainer = document.createElement('div');
        this.paginationWrapperTopContainer.classList.add('tableBeautifuller', 'pagination-wrapper-top-container');
        this.table.parentNode.insertBefore(this.paginationWrapperTopContainer, this.table);

        // Création du wrapper "pagination-down-container" en dessous du tableau
        this.paginationWrapperDownContainer = document.createElement('div');
        this.paginationWrapperDownContainer.classList.add('tableBeautifuller', 'pagination-down-container');
        this.table.parentNode.appendChild(this.paginationWrapperDownContainer);
    }

    debounce(func, delay) {
        let debounceTimer;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => func.apply(context, args), delay);
        };
    }

    addSearchInput() {
        this.searchInput = document.createElement("input");
        this.searchInput.setAttribute("type", "text");
        this.searchInput.setAttribute("placeholder", "Recherche...");
        this.searchInput.className = "search-input";
        this.paginationWrapperTopContainer.appendChild(this.searchInput);

        this.searchInput.addEventListener("keyup", this.debounce(() => {
            this.searchTable(null, this.searchInput.value);
        }, this.debounce_delai));
    }

    addSearchColumn() {
        let searchRow = document.createElement('tr');
        searchRow.classList.add("thead-search");

        let headers = this.table.querySelectorAll("th");
        headers.forEach(header => {
            let cell = document.createElement('th');
            let searchType = header.getAttribute('data-search') ?? '';

            switch (searchType) {
                case "input":
                    let input = document.createElement('input');
                    input.type = "text";
                    input.addEventListener('input', this.debounce((e) => {
                        this.searchTable(header.cellIndex, e.target.value);
                    }, this.debounce_delai));
                    cell.appendChild(input);
                break;
                case "combobox":
                    let select = document.createElement('select');
                    let uniqueValues = this.getUniqueValuesForColumn(header.cellIndex);
                    select.innerHTML = `<option value="">Tout</option>`;
                    uniqueValues.forEach(val => {
                        let option = document.createElement('option');
                        option.value = val;
                        option.textContent = val;
                        select.appendChild(option);
                    });

                    select.addEventListener('change', this.debounce((e) => {
                        this.searchTable(header.cellIndex, e.target.value);
                    }, this.debounce_delai));
                    cell.appendChild(select);
                break;
                default:
                    return;
            }

            searchRow.appendChild(cell);
        });

        this.table.querySelector('thead').appendChild(searchRow);
    }

    getUniqueValuesForColumn(colIndex) {
        let values = [];
        let rows = this.table.querySelector("tbody").querySelectorAll("tr");
        rows.forEach(row => {
            let value = row.cells[colIndex].textContent.trim();
            if (!values.includes(value)) {
                values.push(value);
            }
        });
        return values;
    }

    addSortingArrows() {
        let headers = this.table.querySelectorAll("th");
        headers.forEach((header, idx) => {
            header.dataset.sort = 'none';

            let arrow = document.createElement('span');
            arrow.classList.add('sort-arrow');
            header.appendChild(arrow);

            let boundHandler = this.headerClickHandler.bind(this, header, idx);
            header._sortingHandler = boundHandler;

            header.addEventListener("click", boundHandler);
        });
    }

    headerClickHandler(header, idx) {
        let sortDirection = header.dataset.sort === 'asc' ? 'desc' : 'asc';
        this.sortTable(idx, sortDirection);
        header.dataset.sort = sortDirection;
        this.updateArrows(header);
    }

    updateArrows(currentHeader) {
        // Reset all arrows
        this.table.querySelectorAll(".sort-arrow").forEach(arrow => {
            arrow.textContent = '';
        });

        let arrowSpan = currentHeader.querySelector('.sort-arrow');
        arrowSpan.textContent = currentHeader.dataset.sort === 'asc' ? '▲' : '▼';
    }

    detectColumnType(colIndex) {
        let rows = this.table.querySelector("tbody").querySelectorAll("tr");
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].cells[colIndex]) {
                let content = rows[i].cells[colIndex].hasAttribute('data-order') ? rows[i].cells[colIndex].getAttribute('data-order') : rows[i].cells[colIndex].textContent.trim();
                if (!isNaN(content)) {
                    return 'number';
                }
            }
        }
        return 'string';
    }

    sortTable(colIndex, direction) {
        let type = this.detectColumnType(colIndex);
        let rows = Array.from(this.table.querySelector("tbody").querySelectorAll("tr"));
        rows.sort((a, b) => {
            let A = a.cells[colIndex].hasAttribute('data-order') ? a.cells[colIndex].getAttribute('data-order') : a.cells[colIndex].textContent.trim();
            let B = b.cells[colIndex].hasAttribute('data-order') ? b.cells[colIndex].getAttribute('data-order') : b.cells[colIndex].textContent.trim();

            if (type === 'number') {
                return direction === 'asc' ? A - B : B - A;
            } else {
                return direction === 'asc' ? A.localeCompare(B) : B.localeCompare(A);
            }
        });

        this.table.querySelector("tbody").append(...rows);
    }

    applyInitialOrder() {
        this.initialOrder.forEach(orderCriteria => {
            let [colIndex, direction] = orderCriteria;
            this.sortTable(colIndex, direction.toLowerCase());

            let header = this.table.querySelector(`th:nth-child(${colIndex + 1})`);
            header.dataset.sort = direction.toLowerCase();
            this.updateArrows(header);
        });
    }

    searchTable(colIndex, query) {
        let rows = this.table.querySelectorAll("tbody tr");

        // Reset de la recherche
        rows.forEach(row => {
            row.dataset.matched = "true";
            row.style.display = "";
        });

        // Recherche 
        rows.forEach(row => {
            let rowText = ""
            if( colIndex != null ) {
                let cell = row.cells[colIndex];
                rowText = cell.hasAttribute("data-search") ? cell.getAttribute("data-search") : cell.textContent;
            } else  {
                let cells = Array.from(row.getElementsByTagName("td"));
                rowText = cells.map(cell => {
                    return cell.hasAttribute("data-search") ? cell.getAttribute("data-search") : cell.textContent;
                }).join(' ');
            }

            rowText = rowText.trim().toLowerCase();
            if (rowText.indexOf(query.toLowerCase()) !== -1) {
                row.style.display = "";
                row.dataset.matched = "true";
            } else {
                row.style.display = "none";
                row.dataset.matched = "false";
            }
        });

        // Remise à zéro de la pagination et repagination avec les résultats filtrés
        this.currentPage = 1;
        this.paginate();
    }

    paginate() {
        let totalRows = Array.from(this.table.querySelectorAll("tbody tr")).filter(row => row.dataset.matched !== "false").length;
        let totalPages = Math.ceil(totalRows / this.pageLength);
        let startIdx = (this.currentPage - 1) * this.pageLength;
        let endIdx = startIdx + this.pageLength;

        if( this.displayBloc.info) {
            let endDisplay = endIdx > totalRows ? totalRows : endIdx;
            this.infoLabel.textContent = `Affichage de l'élément ${startIdx + 1} à ${endDisplay} sur ${totalRows} éléments`;
        }

        // Control display of previous & next buttons
        this.prevButton.disabled = this.currentPage <= 1;
        this.nextButton.disabled = this.currentPage >= totalPages

        let rows = Array.from(this.table.querySelectorAll("tbody tr")).filter(row => row.dataset.matched !== "false");
        rows.forEach((row, idx) => {
            row.style.display = idx < startIdx || idx >= endIdx ? "none" : "";
        });

        let startPage = Math.max(1, this.currentPage - 2);
        let endPage = Math.min(totalPages, this.currentPage + 2);

        let pageButtons = this.paginationWrapperDownContainer.querySelectorAll('.page-btn');
        pageButtons.forEach((btn, idx) => {
            let pageNumber = startPage + idx;
            btn.textContent = pageNumber;
            btn.style.display = pageNumber <= endPage ? '' : 'none';
            btn.classList.toggle('active', pageNumber === this.currentPage);
        });
    }

    addInfoControls() {
        this.infoLabel = document.createElement('span');
        this.infoLabel.className = 'pagination-info';
        this.paginationWrapperDownContainer.appendChild(this.infoLabel);
    }

    addPaginationControls() {
        // Items per page select
        this.paginationWrapperTop = document.createElement('div');
        this.paginationWrapperTop.className = 'pagination-wrapper-top';

        this.paginationInfoTop = document.createElement("span");
        this.paginationInfoTop.textContent = "Afficher";
        this.paginationWrapperTop.appendChild(this.paginationInfoTop);

        this.paginationSelect = document.createElement("select");
        this.selectItemPage.forEach(num => {
            let option = document.createElement("option");
            option.value = num;
            option.textContent = num;
            option.selected = num === this.pageLength ? true : false;
            this.paginationSelect.appendChild(option);
        });
        this.paginationSelect.value = this.pageLength;
        this.paginationWrapperTop.appendChild(this.paginationSelect);

        this.paginationInfoTopAfter = document.createElement("span");
        this.paginationInfoTopAfter.textContent = "éléments";
        this.paginationWrapperTop.appendChild(this.paginationInfoTopAfter);

        this.paginationWrapperTopContainer.appendChild(this.paginationWrapperTop);

        // Create du wrapper "pagination-buttons-container" for boutton
        this.paginationButtonsContainer = document.createElement('div');
        this.paginationButtonsContainer.className = 'pagination-buttons-container';

        this.prevButton = document.createElement('button');
        this.prevButton.textContent = 'Précédent';
        this.paginationButtonsContainer.appendChild(this.prevButton);

        for (let i = 1; i <= 5; i++) {
            let pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.className = 'page-btn';
            pageButton.addEventListener('click', () => {
                this.currentPage = parseInt(pageButton.textContent);
                this.paginate();
            });
            this.paginationButtonsContainer.appendChild(pageButton);
        }

        this.nextButton = document.createElement('button');
        this.nextButton.textContent = 'Suivant';
        this.paginationButtonsContainer.appendChild(this.nextButton);
        this.paginationWrapperDownContainer.appendChild(this.paginationButtonsContainer);

        this.paginationSelect.addEventListener("change", () => {
            this.pageLength = parseInt(this.paginationSelect.value);
            this.currentPage = 1;
            this.paginate();
        });

        this.prevButton.addEventListener('click', () => {
            this.currentPage--;
            this.paginate();
        });

        this.nextButton.addEventListener('click', () => {
            this.currentPage++;
            this.paginate();
        });
    }

    destroy() {
        // Supprimer l'input de recherche
        if (this.searchInput) {
            this.searchInput.remove();
        }

        // Supprimer les flèches de tri et les gestionnaires d'événements
        let headers = this.table.querySelectorAll("th");
        headers.forEach(header => {
            if (header._sortingHandler) {
                header.removeEventListener("click", header._sortingHandler);
                delete header._sortingHandler;
            }

            let arrow = header.querySelector(".sort-arrow");
            if (arrow) {
                arrow.remove();
            }
        });

        // Afficher toutes les lignes du tableau
        let rows = this.table.querySelectorAll("tbody tr");
        rows.forEach(row => {
            row.style.display = "";
        });

        if (this.paginationWrapperTopContainer) {
            this.paginationWrapperTopContainer.remove();
        }

        if (this.paginationWrapperDownContainer) {
            this.paginationWrapperDownContainer.remove();
        }

        // Supprimer la ligne de recherche (filtres) dans l'en-tête
        let searchRow = this.table.querySelector(".thead-search");
        if (searchRow) {
            searchRow.remove();
        }
    }
}