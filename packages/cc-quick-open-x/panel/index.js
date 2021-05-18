const fs = require('fs');
const path = require('path');

const createVue = function (elem) {
    const vm = new Vue({
        el: elem,
        data: {
            datas: [],
            search: "",
            results: [],
            isOpen: false,
            arrowCounter: 0,
            selected: '',
            isFullPath: false,
        },

        created: function () {
            this.updateSearchData();
        },

        watch: {
            search() {
                if (this.search !== "") {
                    this.filterResults();
                    this.isOpen = true;
                } else {
                    this.arrowCounter = 0;
                    this.isOpen = false;
                }
            }
        },
        methods: {
            updateSearchData() {
                this.$data.datas = getSearchItems(path.join(Editor.Project.path, '/assets'));
            },
            filterResults() {
                this.results = this.datas.filter(item => {
                    const key = this.isFullPath ? 'path' : 'name';
                    const s1 = this.search.toLowerCase();
                    const s2 = item[key].toLowerCase();
                    const index = s2.indexOf(s1);
                    if (index > -1) {
                        item.sort = index;
                        return true;
                    }
                    if (new RegExp(s1.split('').join('.*')).test(s2)) {
                        item.sort = 9999;
                        return true;
                    }
                    return false;
                });
                this.results = this.results.sort((r1, r2) => {
                    if (r1.sort === r2.sort) {
                        const key = this.isFullPath ? 'path' : 'name';
                        return r1[key].length - r2[key].length;
                    } else {
                        return r1.sort - r2.sort;
                    }
                });
            },
            setResult(result) {
                if (this.results.length !== 0) {
                    this.search = this.isFullPath ? result.path : result.name;
                    this.arrowCounter = -1;
                    this.isOpen = false;
                }
            },
            onArrowDown(event) {
                event.stopPropagation();
                event.preventDefault();
                if (this.arrowCounter < this.results.length - 1) {
                    this.arrowCounter = this.arrowCounter + 1;
                } else {
                    this.arrowCounter = 0;
                    this.$els.fileslist.scrollTop = 0;
                }
                this.updateScroll();
            },
            onArrowUp(event) {
                event.stopPropagation();
                event.preventDefault();
                if (this.arrowCounter > 0) {
                    this.arrowCounter = this.arrowCounter - 1;
                    this.updateScroll();
                }
            },
            onEnter(event) {
                event.stopPropagation();
                event.preventDefault();
                if (this.isOpen && this.results[this.arrowCounter]) {
                    const filePath = path.join(Editor.Project.path, '/assets/', this.results[this.arrowCounter].path);
                    const uuid = Editor.remote.assetdb.fspathToUuid(filePath);
                    if (filePath.endsWith('.fire')) {
                        Editor.Panel.open('scene', {
                            uuid,
                        });
                    } else if (filePath.endsWith('.prefab')) {
                        Editor.Ipc.sendToAll('scene:enter-prefab-edit-mode', uuid);
                    }
                    this.search = '';
                    this.arrowCounter = 0;
                    this.isOpen = false;
                    this.updateScroll();
                    Editor.Ipc.sendToPanel('quick-open-x', 'quick-open-x:search');
                }
            },
            onEsc(event) {
                event.stopPropagation();
                event.preventDefault();
                if (this.search === '') {
                    Editor.Ipc.sendToPanel('quick-open-x', 'quick-open-x:search');
                } else {
                    this.search = '';
                }
            },
            onTab(event) {
                event.stopPropagation();
                event.preventDefault();
                this.isFullPath = !this.isFullPath;
                if (this.search !== '') {
                    this.filterResults();
                    this.arrowCounter = 0;
                    this.updateScroll();
                }
            },
            updateScroll() {
                if (this.arrowCounter === 0) {
                    this.$els.fileslist.scrollTop = 0;
                    return;
                }
                if (this.arrowCounter >= 10) {
                    const offset = (this.arrowCounter - 9) * 30;
                    this.$els.fileslist.scrollTop = offset;
                }
            }
        }
    });
    return vm;
};

Editor.Panel.extend({

    style: fs.readFileSync(Editor.url('packages://quick-open-x/panel/index.css')) + '',

    template: fs.readFileSync(Editor.url('packages://quick-open-x/panel/index.html')) + '',

    $: {
        btn: '#btn',
    },

    ready() {
        this.$btn.addEventListener('confirm', () => {
            this.messages['quick-open-x:search'].apply(this);
        });
        const markDiv = document.createElement('div');
        markDiv.id = 'overlay';
        document.body.appendChild(markDiv);
        markDiv.style.cssText = `
            width: 100%;
            height: 0;
            position: absolute;
            left: 0;
            top: 0;
            z-index: 1;
            visibility: hidden;
        `;
        markDiv.innerHTML = fs.readFileSync(Editor.url('packages://quick-open-x/panel/search.html')) + '';
        this._vm = createVue(markDiv);
        this._markDiv = markDiv;
        Editor.Ipc.sendToMain('quick-open-x:panel-ready');
    },

    close() {
        if (this._vm) {
            this._vm.$destroy();
            this._vm = null;
        }
        if (this._markDiv) {
            this._markDiv.parentNode.removeChild(this._markDiv);
            this._markDiv = null;
        }
        Editor.Ipc.sendToMain('quick-open-x:panel-close');
    },

    messages: {
        'quick-open-x:search'(event) {
            if (this._markDiv.style.visibility === 'hidden') {
                this._markDiv.style.visibility = 'visible';
                this._vm.$els.search.focus();
                this._vm.$data.search = '';
            } else {
                this._markDiv.style.visibility = 'hidden';
            }
        },
        'asset-db:assets-created'(event, list) {
            if (list.findIndex(file => file.type === 'scene' || file.type === 'prefab') > -1) {
                this._vm.updateSearchData();
            }
        },
        'asset-db:assets-moved'(event, list) {
            if (list.findIndex(file => file.type === 'scene' || file.type === 'prefab') > -1) {
                this._vm.updateSearchData();
            }
        },
        'asset-db:assets-deleted'(event, list) {
            if (list.findIndex(file => file.type === 'scene' || file.type === 'prefab') > -1) {
                this._vm.updateSearchData();
            }
        },
     
    },

});

function getSearchItems(searchPath) {
    const items = [];
    const walkDir = (currentPath) => {
        const files = fs.readdirSync(currentPath);
        files.forEach(fileName => {
            const filePath = path.join(currentPath, fileName);
            const fileStat = fs.statSync(filePath);
            if (fileStat.isFile() && (fileName.endsWith('.fire') || fileName.endsWith('.prefab'))) {
                items.push({ name: fileName, path: filePath.substr(searchPath.length + 1) });
            } else if (fileStat.isDirectory()) {
                walkDir(filePath);
            }
        });
    };
    walkDir(searchPath);
    return items;
}
