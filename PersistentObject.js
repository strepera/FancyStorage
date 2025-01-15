/**
 * Represents a persistent object that can be saved to and loaded from a file in cim/playerData.
 */
export class PersistentObject {
    /**
     * Constructs a new PersistentObject instance.
     *
     * @param {string} name - The name of the object, used to create the filename.
     * @param {object} obj - The initial object data if no file exists.
     */
    constructor(name, obj) {
      this.fileName = name + ".json";
      let data = FileLib.read("FancyStorage", this.fileName);
      if (!data) {
        data = obj;
        FileLib.write("FancyStorage", this.fileName, JSON.stringify(data));
      } 
      else {
        data = JSON.parse(data);
      }
      this.data = data;
    }
  
    /**
     * Saves the current state of the persistent object to the associated file.
     */
    save() {
      FileLib.write("FancyStorage", this.fileName, JSON.stringify(this.data));
      return this;
    }
  
    /**
     * Sets up automatic saving of the persistent object at regular intervals.
     *
     * @param {number} delay - The delay in seconds between each save operation.
     */
    autosave(delay) {
      register("step", () => {
        this.save();
      }).setDelay(delay);
      return this;
    }
  }