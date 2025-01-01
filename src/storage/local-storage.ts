import joi from "joi";

export class LocalStorage<T> {

  private localStorageKey: string;
  private schema: joi.Schema<T>;

  constructor(localStorageKey: string, schema: joi.Schema<T>) {
    this.localStorageKey = localStorageKey;
    this.schema = schema;
  }

  read(): T | undefined;
  read(defaultData: T): T;
  read(defaultData?: T): T | undefined {
    const dataString = localStorage.getItem(this.localStorageKey);
    if (dataString === null) {
      return defaultData === undefined ? undefined : this.write(defaultData);
    }
    const dataObject = (() => {
      try {
        return JSON.parse(dataString);
      } catch (err) {
        console.warn(`Discarding unparseable localStorage string for key '${this.localStorageKey}': ${err}: ${dataString} }`);
        return defaultData === undefined ? undefined : this.write(defaultData);
      }
    })();
    const { error, value } = this.schema.validate(dataObject);
    if (error !== undefined) {
      console.warn(`Local storage data failed validation: ${error.message}.`);
      return defaultData === undefined ? undefined : this.write(defaultData);
    }
    return value;
  }

  write(data: T): T {
    const { error, value } = this.schema.validate(data);
    if (error !== undefined) {
      throw new Error(`Cannot save data to local storage because the data doesn't match the schema: ${error.message}.`);
    }
    const valueString = JSON.stringify(value);
    localStorage.setItem(this.localStorageKey, valueString);
    return data;
  }

}
