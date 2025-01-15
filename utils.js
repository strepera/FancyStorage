const letters = [
    'a', 'b', 'c', 'd', 'e', 'f',
    'g', 'h', 'i', 'j', 'k',
    'l', 'm', 'n', 'o', 'p', 'q',
    'r', 's', 't', 'u', 'v', 'w',
    'x', 'y', 'z', '_', ' ', '-', '+', '.', ',', '[', ']', '{', '}', '(', ')', '&', "'", '"',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
  ];
  class TextInput {
  
    _onGuiKeys = [];
    _onEnter = [];
  
    pointerIndex = 0;
  
    text = "";
  
    isActive = false;
  
    isCtrlDown = false;
    selection = [0, 0];
  
    constructor(singleUse, placeholderText) {
  
      this.placeholderText = placeholderText;
  
      let regs = [
  
        register("guiKey", (char, keyCode, gui, event) => {
          if (!this.isActive) return;
          cancel(event);
          switch (keyCode) {
            case 28:
              this._onEnter.forEach(cb => cb(this.text));
              if (!singleUse) break;
              regs.forEach(reg => reg.unregister());
              return;
            case 1:
              this.isActive = false;
              Client.currentGui.close();
              break;
            case 14:
              this.text = this.text.slice(this.selection[1], this.text.length);
              this.selection = [0, 0];
              if (this.pointerIndex < this.text.length) {
                this.text = this.text.slice(0, this.text.length-this.pointerIndex - 1) + this.text.slice(this.text.length-this.pointerIndex, this.text.length);
              }
              if (this.isCtrlDown) {
                for (let i = this.text.length-1; i > -1 && this.text[i] !== " "; i--) {
                  this.text = this.text.slice(0, i);
                }
              }
              this._onGuiKeys.forEach(cb => {cb(this.text)});
              break;
            case 211:
              if (this.pointerIndex > 0) {
                this.text = this.text.slice(0, this.text.length-this.pointerIndex) + this.text.slice(this.text.length-this.pointerIndex + 1, this.text.length);
                this.pointerIndex--;
                this._onGuiKeys.forEach(cb => {cb(this.text)});
              }
              break;
            case 203:
              this.selection = [0, 0];
              if (this.pointerIndex < this.text.length) {
                this.pointerIndex++;
              }
              break;
            case 205:
              this.selection = [0, 0];
              if (this.pointerIndex > 0) {
                this.pointerIndex--;
              }
              break;
            case 30:
              if (!this.isCtrlDown) break;
              this.selection = [0, this.text.length];
              break;
            default:
              break;
          }
          if (!letters.includes(ChatLib.removeFormatting(char).toLowerCase())) return;
          this.text = this.text.slice(this.selection[1], this.text.length);
          this.selection = [0, 0];
          this.text = this.text.slice(0, this.text.length-this.pointerIndex) + char + this.text.slice(this.text.length-this.pointerIndex, this.text.length);
          this._onGuiKeys.forEach(cb => {cb(this.text)});
        }),
  
        register("guiClosed", () => {
          this.isActive = false;
          this.isCtrlDown = false;
        })
  
      ]
  
    }
  
    draw(x, y, w, h) {
      let text = this.text || this.placeholderText;
      Renderer.drawString((this.isActive? "&n" : "") + text, x+2, y+2, true);
      if (!this.isActive) return;
      let width = Renderer.getStringWidth(this.text.slice(0, this.text.length - this.pointerIndex));
      let beginning = Renderer.getStringWidth(this.text.slice(0, this.selection[0]));
      let mid = Renderer.getStringWidth(this.text.slice(this.selection[0], this.selection[1]));
      Renderer.drawRect(Renderer.color(50, 150, 50, 100), x+2+beginning, y+2, mid, 10);
      Renderer.drawLine(Renderer.color(220, 220, 220), x+width+2, y+h, x+width+8, y+h, 1.5);
      this.isCtrlDown = Keyboard.isKeyDown(29);
    }
  
    onGuiKey(cb) {
      this._onGuiKeys.push(cb);
    }
  
    onEnter(cb) {
      this._onEnter.push(cb);
    }
  
  }
  
  class Utils {
  
    static textInput = TextInput; 
  
    static getItemFromNBT = (nbtStr) => {
      let nbt = net.minecraft.nbt.JsonToNBT.func_180713_a(nbtStr); // Get MC NBT object from string
      let count = nbt.func_74771_c('Count'); // get byte
      let id = nbt.func_74765_d('id') || nbt.func_74779_i('id'); // get short || string
      let damage = nbt.func_74765_d('Damage'); // get short
      let tag = nbt.func_74781_a('tag'); // get tag
      let item = new Item(id); // create ct item object
      item.setStackSize(count);
      item = item.getItemStack(); // convert to mc object
      item.func_77964_b(damage); // set damage of mc item object
      if (tag) item.func_77982_d(tag); // set tag of mc item object
      item = new Item(item); // convert back to ct object
      return item;
    }
  
    static ResourceLocation = Java.type("net.minecraft.util.ResourceLocation");
  
    static textureManager = Client.getMinecraft().func_110434_K();
  
    static bindTexture = (resource) => {
      Utils.textureManager.func_110577_a(resource);
    }
  
    static _locationBlocksTexture = net.minecraft.client.renderer.texture.TextureMap.field_110575_b;
  
    static draw2dResourceLocation = (resource, x, y, w, h, uMin, uMax, vMin, vMax) => {
  
      Utils.bindTexture(resource);
  
      GL11.glBegin(GL11.GL_QUADS);
      GL11.glTexCoord2f(uMin, vMax)
      GL11.glVertex2f(x, y + h);
      GL11.glTexCoord2f(uMax, vMax)
      GL11.glVertex2f(x + w, y + h);
      GL11.glTexCoord2f(uMax, vMin)
      GL11.glVertex2f(x + w, y);
      GL11.glTexCoord2f(uMin, vMin)
      GL11.glVertex2f(x, y);
      GL11.glEnd();
  
      Utils.bindTexture(Utils._locationBlocksTexture);
  
    }
  
    static drawStackSize = (item, x, y, z, size) => {
      if (!z) z = 400;
      let stackSize = size? size : item.getStackSize();
      if (stackSize <= 1) return;
      if (stackSize > 999) {
        stackSize = Utils.formatNumber(stackSize, 0);
      }
      Tessellator.pushMatrix();
      Renderer.translate(0, 0, z);
      Renderer.drawString(stackSize, x + (3 - stackSize.toString().length) * 5 + 1, y + 9, true);
      Tessellator.popMatrix();
    }
  
    static fontRenderer = Renderer.getFontRenderer();
    static GuiUtils = net.minecraftforge.fml.client.config.GuiUtils;
  
    static drawTooltip = (lore, x, y) => {
      Utils.GuiUtils.drawHoveringText(
        lore.join("\n").split("\n"),
        x,
        y,
        Renderer.screen.getWidth(),
        Renderer.screen.getHeight(),
        500,
        Utils.fontRenderer
      );
    }
  
    static getItemFromNBT(nbtStr) {
      let nbt = net.minecraft.nbt.JsonToNBT.func_180713_a(nbtStr); // Get MC NBT object from string
      let count = nbt.func_74771_c('Count'); // get byte
      let id = nbt.func_74765_d('id') || nbt.func_74779_i('id'); // get short || string
      let damage = nbt.func_74765_d('Damage'); // get short
      let tag = nbt.func_74781_a('tag'); // get tag
      let item = new Item(id); // create ct item object
      item.setStackSize(count);
      item = item.getItemStack(); // convert to mc object
      item.func_77964_b(damage); // set damage of mc item object
      if (tag) item.func_77982_d(tag); // set tag of mc item object
      item = new Item(item); // convert back to ct object
      return item;
    }
  
    static _getSuffix(num) {
      num = Math.abs(num);
      if (num >= 1000000000000) return "T";
      else if (num >= 1000000000) return "B";
      else if (num >= 1000000) return "M";
      else if (num >= 1000) return "k";
      return "";
    }
    
    static _suffixes = {
      "T": 1000000000000,
      "B": 1000000000,
      "M": 1000000,
      "k": 1000,
      "": 1
    }
  
    static formatNumber(num, decimals = 2) {
      num = parseFloat(num);
      if (!num) return 0;
      if (num < 1000 && num > -1000) return Math.floor(num);
    
      const suffix = Utils._getSuffix(num);
      num /= Utils._suffixes[suffix];
    
      if (num.toFixed(decimals).endsWith(("0".repeat(decimals)))) {
        return Math.floor(num) + suffix;
      }
      return num.toFixed(decimals) + suffix;
    }
  
  }
  export default Utils;