import Utils from './utils.js';
import { PersistentObject } from './PersistentObject.js';

const getDefault = () => {
  return {
    enderchest: {
      1: {items: {}, command: "ec 1"},
      2: {items: {}, command: "ec 2"},
      3: {items: {}, command: "ec 3"},
      4: {items: {}, command: "ec 4"},
      5: {items: {}, command: "ec 5"},
      6: {items: {}, command: "ec 6"},
      7: {items: {}, command: "ec 7"},
      8: {items: {}, command: "ec 8"},
      9: {items: {}, command: "ec 9"}
    },
    backpacks: {
      1: {items: {}, command: "bp 1"},
      2: {items: {}, command: "bp 2"},
      3: {items: {}, command: "bp 3"},
      4: {items: {}, command: "bp 4"},
      5: {items: {}, command: "bp 5"},
      6: {items: {}, command: "bp 6"},
      7: {items: {}, command: "bp 7"},
      8: {items: {}, command: "bp 8"},
      9: {items: {}, command: "bp 9"},
      10: {items: {}, command: "bp 10"},
      11: {items: {}, command: "bp 11"},
      12: {items: {}, command: "bp 12"},
      13: {items: {}, command: "bp 13"},
      14: {items: {}, command: "bp 14"},
      15: {items: {}, command: "bp 15"},
      16: {items: {}, command: "bp 16"},
      17: {items: {}, command: "bp 17"},
      18: {items: {}, command: "bp 18"}
    },
    sacks: {
      items: {},
      icons: {}
    }
  }
}

const storage = new PersistentObject("storage", {currentProfile: null, modEnabled: true});

register("command", () => {
  storage.data.modEnabled = !storage.data.modEnabled;
  storage.save();
  ChatLib.chat('&e[FancyStorage] Fancy Storage gui enabled is now: &6' + storage.data.modEnabled);
}).setName("fancystorage")

const setProfileStorage = (profile) => {
  storage.data.currentProfile = profile;
  storage.save();
  if (storage.data[profile]) return;
  storage.data[profile] = getDefault();
  storage.save();
  ChatLib.chat('&e[FancyStorage] Initialized storage data for profile ' + profile);
}

const getStorage = () => {
  if (!storage.data.currentProfile) {
    ChatLib.chat('&e[FancyStorage] Please switch skyblock lobbies to initialize data');
    return getDefault();
  }
  return storage.data[storage.data.currentProfile];
}

register("packetReceived", (packet, event) => {
  if (packet.func_148916_d()) return;
  let message = new Message(packet.func_148915_c()).getFormattedText();
  if (match = message.match(/§r§aYou are playing on profile: §e(\S+)§.*/)) {
    setProfileStorage(match[1]);
  }
  else if (match = message.match(/§r§r§r§7Switching to profile (\S+)\.\.\.§r/)) {
    setProfileStorage(match[1]);
  }
}).setFilteredClass(net.minecraft.network.play.server.S02PacketChat);

// look for added and removed sack items
register("chat", (event) => {
  let parts = new Message(EventLib.getMessage(event)).getMessageParts();
  for (let part of parts) {
    let text = part.getHoverValue();
    if (!text) continue;
    if (match = ChatLib.removeFormatting(text).match(/\+([0-9,]+) (.+) \((.+) Sack(.+ Sack)?\)/)) {
      let num = Number(match[1].replaceAll(",", ""));
      if (!getStorage().sacks.items[match[2]]) return;
      getStorage().sacks.items[match[2]].amount += num/2;
      storage.save();
    }
    else if (match = ChatLib.removeFormatting(text).match(/-([0-9,]+) (.+) \((.+) Sack(.+ Sack)?\)/)) {
      let num = Number(match[1].replaceAll(",", ""));
      if (!getStorage().sacks.items[match[2]]) return;
      getStorage().sacks.items[match[2]].amount -= num/2;
      storage.save();
    }
  }
})

const setItems = () => {
  const container = Player.getContainer();
  if (!container) return;
  const size = container.getSize();
  const name = container.getName();
  const items = container.getItems();
  if (match = name.match(/Ender Chest \((\d+)\/\d+\)/)) {
    getStorage().enderchest[match[1]].index = match[1]-1;
    getStorage().enderchest[match[1]].name = name;
    getStorage().enderchest[match[1]].size = size - 45;
    for (let i = 9; i < size - 36; i++) {
      getStorage().enderchest[match[1]].items[i] = items[i]? items[i].getRawNBT() : null;
    }
    storage.save();
  }
  else if (match = name.match(/(?:.+)Backpack(?:.+)\(Slot #(\d+)\)/)) {
    getStorage().backpacks[match[1]].index = match[1]-1;
    getStorage().backpacks[match[1]].name = name;
    getStorage().backpacks[match[1]].size = size - 45;
    for (let i = 9; i < size - 36; i++) {
      getStorage().backpacks[match[1]].items[i] = items[i]? items[i].getRawNBT() : null;
    }
    storage.save();
  }
  else if (name == "Sack of Sacks") {
    for (let item of items) {
      if (!item.getName()) continue;
      let replaced = ChatLib.removeFormatting(item.getName().replace(/(Small |Medium |Large )/, ""));
      if (replaced.includes("Sack")) {
        if (!getStorage().sacks.icons) getStorage().sacks.icons = {};
        getStorage().sacks.icons[replaced] = item.getRawNBT();
      }
    }
    storage.save();
  }
  else if (match = name.match(/(.+) Sack$/)) {
    for (let item of items) {
      let lore = item?.getLore();
      if (!lore) continue;
      for (let line of lore)  {
        if (match2 = ChatLib.removeFormatting(line).match(/Stored: ([0-9,]+)\/(\S+)/)) {
          if (!getStorage().sacks.items) getStorage().sacks.items = {};
          getStorage().sacks.items[ChatLib.removeFormatting(item.getName())] = {
            sack: name.replace("Gemstones", "Gemstone"),
            amount: Number(match2[1].replaceAll(",", "")),
            name: ChatLib.removeFormatting(item.getName()),
            item: item.getRawNBT()
          };
          break;
        }
      }
    }
    storage.save();
  }
}

register("guiOpened", () => {
  Client.scheduleTask(2, setItems);
})

const drawItem = (item, x, y, mx, my, size) => {
  if (!item) return;
  item.draw(x, y);
  Utils.drawStackSize(item, x, y, 400, size);
  if (mx > x && mx < x+18 && my > y && my < y+18) {
    tooltips.push({lines: item.getLore(), x: mx, y: my});
  }
}

let scrollBuffer = 0;
let scroll = 0;
let heldItem;
let shouldBeAbleToClick = false;
let shouldBeAbleToRightClick = false;
let tooltips = [];

const drawToggleButton = (mx, my) => {
  const x = Renderer.screen.getWidth()/2-50;
  const y = Renderer.screen.getHeight()-50;
  const w = 100;
  const h = 40;
  Renderer.drawRect(storage.data.modEnabled? Renderer.GREEN : Renderer.RED, x, y, w, h);
  if (mx > x && mx < x+w && my > y && my < y+h) {
    Renderer.drawRect(Renderer.WHITE, x+2, y+2, w-4, h-4);
    if (Mouse.isButtonDown(0)) {
      if (shouldBeAbleToClick) {
        storage.data.modEnabled = !storage.data.modEnabled;
        storage.save();
        World.playSound('gui.button.press', 1, 1);
        shouldBeAbleToClick = false;
      }
    }
    else {
      shouldBeAbleToClick = true;
    }
  }
  Renderer.drawString("&0Fancy Storage\n&0Enabled: " + storage.data.modEnabled + "\n&0(Reopen storage\n&0to refresh)", x+4, y+4);
}

const sacksItem = Utils.getItemFromNBT('{id:"minecraft:skull",Count:1b,tag:{HideFlags:254,SkullOwner:{Id:"6ba54607-3d0c-4bac-8da8-5398ed77ce69",hypixelPopulated:1b,Properties:{textures:[0:{Value:"ewogICJ0aW1lc3RhbXAiIDogMTU5MTMxMDU4NTYwOSwKICAicHJvZmlsZUlkIiA6ICI0MWQzYWJjMmQ3NDk0MDBjOTA5MGQ1NDM0ZDAzODMxYiIsCiAgInByb2ZpbGVOYW1lIiA6ICJNZWdha2xvb24iLAogICJzaWduYXR1cmVSZXF1aXJlZCIgOiB0cnVlLAogICJ0ZXh0dXJlcyIgOiB7CiAgICAiU0tJTiIgOiB7CiAgICAgICJ1cmwiIDogImh0dHA6Ly90ZXh0dXJlcy5taW5lY3JhZnQubmV0L3RleHR1cmUvODBhMDc3ZTI0OGQxNDI3NzJlYTgwMDg2NGY4YzU3OGI5ZDM2ODg1YjI5ZGFmODM2YjY0YTcwNjg4MmI2ZWMxMCIKICAgIH0KICB9Cn0="}]},Name:"§6ba54607-3d0c-4bac-8da8-5398ed77ce69"},display:{Lore:[0:"§7A sack which contains other sacks.",1:"§7Sackception!",2:"",3:"§eClick to open!"],Name:"§aSack of Sacks"}},Damage:3s}');

const input = new Utils.textInput(false, "&7Search storage...");

const Mouse = Java.type("org.lwjgl.input.Mouse");

const generic54 = new Utils.ResourceLocation("textures/gui/container/generic_54.png");
const demo = new Utils.ResourceLocation("textures/gui/demo_background.png");
const drawStorage = (event, items, name, updateDrawData, currentSack) => {
  cancel(event);
  Tessellator.pushMatrix();

  scroll += scrollBuffer / 2;
  scrollBuffer /= 1.5;

  const screenWidth = Renderer.screen.getWidth();
  const screenHeight = Renderer.screen.getHeight();

  const mx = Client.getMouseX();
  const my = Client.getMouseY();

  const rows = Math.floor(screenHeight/200);
  const w = 175;
  const h = 122;
  const x = screenWidth/2-w/2;
  const y = screenHeight/2-(h/2)*(rows)+1 - 42;
  const lmbDown = Mouse.isButtonDown(0);
  const rmbDown = Mouse.isButtonDown(1);

  // grey background
  Renderer.drawRect(Renderer.color(0, 0, 0, 150), 0, 0, screenWidth, screenHeight);

  // toggle button
  drawToggleButton(mx, my);

  // background
  Utils.draw2dResourceLocation(demo, screenWidth/2 - 248*1.25, y, 248*2.5, (y+rows*h)-y + 126, 0, 248/256, 0, 166/256);

  // search bar
  const ix = screenWidth/2+86;
  const iy = (screenHeight + 122*Math.floor(screenHeight/200) - 82) / 2;
  const inputMouseOver = mx > ix-2 && mx < ix+82 && my > iy-2 && my < iy+12;
  input.placeholderText = inputMouseOver? "&eSearch storage..." : "&7Search storage...";
  input.draw(ix, iy, 0, 10);
  if (lmbDown) {
    input.isActive = inputMouseOver;
  }

  // enderchest and backpack pages
  let index = 0;
  for (let type of [items.enderchest, items.backpacks]) {
    for (let page of type) {
      let rowIndex = Math.floor(index/3);
      let colIndex = index % 3;
      let rX = x - w + colIndex*w + 8;
      let rY = y+rowIndex*h+scroll + 18;
      if (rY > y && rY < (y+rows*h)) {
        Renderer.drawString((name == "Storage" || name != page.name)? page.name : "&e" + page.name, rX, rY-12, true);
      }
      // check if mouse is over a page and check for click
      if (mx > rX && mx < rX+162 && my > rY && my < rY + Math.min(page.size/9*18+4, (y+rows*h)-(rY-3))) {
        Renderer.drawRect(Renderer.YELLOW, rX-3, rY-3, 162+4, Math.min(page.size/9*18+4, (y+rows*h)-(rY-3)));
        if (name != page.name && lmbDown && shouldBeAbleToClick) {
          ChatLib.command(page.command);
          World.playSound('gui.button.press', 1, 1);
          shouldBeAbleToClick = false;
        }
      }
      // draw page slots
      for (let i = 0; i < page.size/9; i++) {
        let vMin = Math.min(18, (rY+i*18)-(y-18));
        let vMax = Math.min(18, (y+rows*h)-(rY+i*18));
        if (vMax < 0) break;
        if (name != "Storage" && name != page.name) {
          Tessellator.colorize(0.2, 0.2, 0.2, 1);
        }
        Utils.draw2dResourceLocation(generic54, rX-1, rY+i*18 - 1 - vMin + 18, 162, Math.min(vMin, vMax), 7/256, 169/256, (vMin-1)/256, (17+vMax)/256);
        Tessellator.colorize(1, 1, 1, 1);
      }
      // draw items
      let itemHovered = false;
      for (let i = 0; i < page.items.length; i++) {
        let item = page.items[i];
        let rIndex = Math.floor(i/9);
        let cIndex = i % 9;
        let rrX = rX + cIndex*18;
        let rrY = rY + rIndex*18;
        if (rrY < y || rrY+18 > (y+rows*h)) continue;
        drawItem(item, rrX, rrY, mx, my);
        if (!itemHovered && mx > rrX && mx < rrX+18 && my > rrY && my < rrY+18) {
          Renderer.translate(0, 0, 400);
          Renderer.drawRect(Renderer.color(255, 255, 255, 150), rrX, rrY, 16, 16);
          if (name != "Storage" && ((lmbDown && shouldBeAbleToClick) || (rmbDown && shouldBeAbleToRightClick))) {
            let click = lmbDown? "LEFT" : "RIGHT";
            new ClickAction(9+i, Player.getContainer().getWindowId()).setClickString(click).setHoldingShift(Keyboard.isKeyDown(Keyboard.KEY_LSHIFT)).complete();
            const itemStack = Player.getPlayer()?.field_71071_by?.func_70445_o();
            heldItem = itemStack? new Item(itemStack) : null;
            shouldBeAbleToClick = false;
            shouldBeAbleToRightClick = false;
            setTimeout(() => {
              setItems();
              updateDrawData();
            }, 100);
          }
          itemHovered = true;
        }
      }
      index++;
    }
  }

  // inventory
  Utils.draw2dResourceLocation(generic54, x, y+rows*h, w+1, 82, 0, 176/256, 139/256, 221/256);
  let inventoryItemHovered = false;
  for (let i = 0; i < items.inventory.length; i++) {
    let item = items.inventory[i];
    let rIndex = Math.floor(i/9);
    let cIndex = i % 9;
    let rrX = x + cIndex*18 + 8;
    let rrY = (y+rows*h) + rIndex*18 + 1;
    if (i > 26) {
      rrY += 4;
    }
    drawItem(item, rrX, rrY, mx, my);
    if (!inventoryItemHovered && mx > rrX && mx < rrX+18 && my > rrY && my < rrY+18) {
      Renderer.translate(0, 0, 400);
      Renderer.drawRect(Renderer.color(255, 255, 255, 150), rrX, rrY, 16, 16);
      if (name != "Storage" && ((lmbDown && shouldBeAbleToClick) || (rmbDown && shouldBeAbleToRightClick))) {
        let click = lmbDown? "LEFT" : "RIGHT";
        new ClickAction(Player.getContainer().getSize()-36+i, Player.getContainer().getWindowId()).setClickString(click).setHoldingShift(Keyboard.isKeyDown(Keyboard.KEY_LSHIFT)).complete();
        const itemStack = Player.getPlayer()?.field_71071_by?.func_70445_o();
        heldItem = itemStack? new Item(itemStack) : null;
        shouldBeAbleToClick = false;
        shouldBeAbleToRightClick = false;
        setTimeout(() => {
          setItems();
          updateDrawData();
        }, 100);
      }
      inventoryItemHovered = true;
    }
  }

  // open sacks button
  drawItem(sacksItem, x-180, (y+rows*h), mx, my);
  if (lmbDown && shouldBeAbleToClick && mx > x-180 && mx < x-180+18 && my > (y+rows*h) && my < (y+rows*h)+18) {
    shouldBeAbleToClick = false;
    World.playSound("gui.button.press", 1, 1);
    ChatLib.command("sacks");
  }

  // sacks buttons
  let icons = items.sacks.icons;
  for (let i = 0; i < icons.length; i++) {
    let item = icons[i].item;
    let rI = Math.floor(i/9);
    let cI = i % 9;
    let rX = x-162 + cI*18;
    let rY = (y+rows*h) + rI*18;
    drawItem(item, rX, rY, mx, my);
    if (mx > rX && mx < rX+18 && my > rY && my < rY+18) {
      if (lmbDown && shouldBeAbleToClick) {
        World.playSound("gui.button.press", 1, 1);
        shouldBeAbleToClick = false;
        currentSack.name = icons[i].name;
        currentSack.items = Object.values(items.sacks.items).filter(item => item.sack == currentSack.name).map(obj => {return {name: obj.name, sack: obj.sack, amount: obj.amount, item: Utils.getItemFromNBT(obj.item)}});
      }
    }
  }

  // sacks items
  for (let i = 0; i < currentSack.items.length; i++) {
    let item = currentSack.items[i];
    let rI = Math.floor(i/9);
    let cI = i % 9;
    let rX = x-162 + cI*18;
    let rY = (y+rows*h) + rI*18 + (Math.floor(items.sacks.icons.length/9)*18) + 18;
    drawItem(item.item, rX, rY, mx, my, item.amount);
    if (mx > rX && mx < rX+18 && my > rY && my < rY+18) {
      if (lmbDown && shouldBeAbleToClick) {
        World.playSound("gui.button.press", 1, 1);
        shouldBeAbleToClick = false;
        let amount = Math.min(64, item.amount);
        ChatLib.command(`gfs ${item.name} ${amount}`);
        getStorage().sacks.items[item.name].amount -= amount;
        storage.save();
        currentSack.items = Object.values(items.sacks.items).filter(item => item.sack == currentSack.name).map(obj => {return {name: obj.name, sack: obj.sack, amount: obj.amount, item: Utils.getItemFromNBT(obj.item)}});
        setTimeout(() => {
          setItems();
          updateDrawData();
        }, 100);
      }
    }
  }

  if (heldItem) {
    Tessellator.translate(0, 0, 500);
    drawItem(heldItem, mx-8, my-8, mx, my);
  }

  if (!lmbDown) shouldBeAbleToClick = true;
  if (!rmbDown) shouldBeAbleToRightClick = true;

  Tessellator.popMatrix();
}

register("guiOpened", () => {
  Client.scheduleTask(1, () => {
    const container = Player.getContainer();
    const name = container.getName();
    const match = name.match(/^(Storage|Ender Chest \((\d+)\/\d+\)|(?:.+)Backpack(?:.+)\(Slot #(\d+)\))$/);
    if (!match) {
      scroll = 0;
      return;
    }
    if (!storage.data.modEnabled) {
      let toggleButtonDrawReg = register("guiRender", (mx, my) => {drawToggleButton(mx, my)});
      let regClosed = register("guiClosed", () => {
        toggleButtonDrawReg.unregister();
        regClosed.unregister();
      })
      return;
    }

    heldItem = null;

    const filter = (pages, searchTerm) => {
      return Object.values(pages)
        .filter(page => Object.keys(page.items).length > 0)
        .map(page => {
          return {
            name: page.name,
            index: page.index,
            size: page.size,
            command: page.command,
            items: Object.values(page.items).
            map(item => {
              if (!item) return;
              if (!item.toLowerCase().includes(searchTerm.toLowerCase())) return;
              return item;
            })
          .map(item => item? Utils.getItemFromNBT(item) : null)
          }
        });
    }

    const getDrawData = () => {
      return {
        enderchest: filter(getStorage().enderchest, ""),
        backpacks: filter(getStorage().backpacks, ""),
        inventory: Player.getInventory().getItems().slice(9).slice(0, 27).concat(Player.getInventory().getItems().slice(0, 9)),
        sacks: {
          icons: Object.entries(getStorage().sacks.icons).map(arr => {return {name: arr[0], item: Utils.getItemFromNBT(arr[1])}}),
          items: getStorage().sacks.items
        }
      }
    };

    let drawData = getDrawData();

    const updateDrawData = () => {
      drawData = getDrawData();
    }

    if (match[1] == "Storage") {
      for (let index = 9; index < 18; index++) {
        if (!ChatLib.removeFormatting(container.getStackInSlot(index)?.getName())?.startsWith('Locked')) {
          let i = index-9;
          if (!drawData.enderchest.map(e => e.index).includes(i)) {
            drawData.enderchest.push({name: "&cClick to load page " + (i+1), size: 45, command: 'ec ' + (i+1), items: []});
            getStorage().enderchest[(i+1)].name = "&cClick to load page " + (i+1);
            getStorage().enderchest[(i+1)].size = 9;
            getStorage().enderchest[(i+1)].items = {                    
              "9": null,"10": null,
              "11": null,"12": null,
              "13": null,"14": null,
              "15": null,"16": null,
              "17": null
            };
          }
        }
      }
      for (let index = 27; index < 45; index++) {
        if (ChatLib.removeFormatting(container.getStackInSlot(index).getName()).startsWith('Backpack')) {
          let i = index-27;
          if (!drawData.backpacks.map(e => e.index).includes(i)) {
            drawData.backpacks.push({name: "&cClick to load backpack " + (i+1), size: 45, command: 'bp ' + (i+1), items: []});
            getStorage().backpacks[(i+1)].name = "&cClick to load backpack " + (i+1);
            getStorage().backpacks[(i+1)].size = 9;
            getStorage().backpacks[(i+1)].items = {                    
              "9": null,"10": null,
              "11": null,"12": null,
              "13": null,"14": null,
              "15": null,"16": null,
              "17": null
            };
          }
        }
      }
      storage.save();
      setTimeout(() => {
        updateDrawData();
      }, 100);
    }

    input.onGuiKey((text) => {
      new Thread(() => {
        drawData.enderchest = filter(getStorage().enderchest, text);
        drawData.backpacks = filter(getStorage().backpacks, text);
      }).start();
    })
    
    let currentSack = {
      name: "",
      items: []
    }

    const pre = net.minecraftforge.client.event.GuiScreenEvent.DrawScreenEvent.Pre;
    let regDraw = register(pre, (event) => {drawStorage(event, drawData, match[1], updateDrawData, currentSack)});

    shouldBeAbleToClick = true;

    let regPostDraw = register("postGuiRender", () => {
      if (!heldItem) {
        Renderer.translate(0, 0, 500);
        let i = tooltips.length;
        while (i--) {
          let tooltip = tooltips[i];
          Utils.drawTooltip(tooltip.lines, tooltip.x, tooltip.y);
        }
        tooltips = [];
        Renderer.translate(0, 0, 300);
      }
    })

    let regClick = register(net.minecraftforge.client.event.GuiScreenEvent.MouseInputEvent.Pre, (event) => {
      cancel(event);
    })

    let regScrolled = register("scrolled", (_, __, direction) => {
      scrollBuffer += direction*18;
    })

    let regClosed = register("guiClosed", () => {
      regDraw.unregister();
      regPostDraw.unregister();
      regClick.unregister();
      regScrolled.unregister();
      regClosed.unregister();
    })
  })
})
