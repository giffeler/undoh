Many programs, especially those with user interaction, have functions to undo or redo processing steps. Implementation usually requires providing a mechanism that produces an opposite of a particular action. These functions have an impact on an underlying data structure.

This Typescript module provides an undo class that can be used to implement a simple undo/redo mechanism in programs. Text-based data structures (strings) and indexable data structures (objects) are supported.

Since changes to individual system states are often incremental in nature, a function is provided which only records the differences in data structures between two actions (diff). To enable object comparability, complex data structures are normalized via the detour of the JSON storage format and their keys are sorted if necessary.

Data is kept in memory only if it differs from its direct predecessor.

Essentially, four **operations** are provided:

- The initialization of an undo/redo buffer as a constructor;
- The storage of the current state (retain);
- the restoration of the previous state (undo);
- The repetition of an undone state (redo).

Static **utility functions** are:

- Sorting by keys of a possibly nested JSON data structure;
- Determining differences (replace, insert, delete) between two texts or arrays;
- The conversion of a text based on the previously identified differences.

Information about the **state** of the stack memory:

- Can an action be undone (canUndo)?
- Can an action be redone (canRedo)?
- How many steps can be undone (countUndo)?
- How many steps can be redone (countRedo)?

To save the current state as a snapshot a value is passed to the retain function. The data type of the passed value must be the same as the one specified when the constructor was initialized. If the constructor is initialized with a string, retain cannot be called with an array, for example.

Undo returns a snapshot of the previous state as a result, if available. At the same time the current state is written into the buffer for redo actions. If there are no (more) previous states in memory, the current state is returned.

The redo function can be executed if undo was called before. If there are no future states in memory, the current state is returned. If the data structure is changed after undo and saved again using retain, all values in memory for future changes with redo are lost from this point on.

### example.html

The following example script shows how easy it is to use the Undo class. A total of four HTML buttons are created. The upper two are linked to the undo and redo function. The lower two buttons create or delete text input fields. Between one and a maximum of five text input fields can be created. The creation or deletion of a field and the modification of its content can be undone or redone.

```html
<!DOCTYPE html>
<html>
<head>
    <script type="module" src="example.js"></script>
    <style>
        button,input { margin: 3px; }
        button { user-select: none; }
    </style>
</head>
<body>
</body>
</html>
```

### example.ts

```typescript
import Undo from "./undo.js";

type idval = { id: string; value: string };

const minInput: number = 1,
  maxInput: number = 5;

let buffer: Undo;

const add: HTMLButtonElement = document.createElement("button"),
  remove: HTMLButtonElement = document.createElement("button"),
  undo: HTMLButtonElement = document.createElement("button"),
  redo: HTMLButtonElement = document.createElement("button"),
  area: HTMLDivElement = document.createElement("div");

const updateButtonUndoRedo = (): void => {
    undo.textContent = `undo ${buffer.countPast}`;
    redo.textContent = `redo ${buffer.countFuture}`;
    undo.disabled = !buffer.canUndo;
    redo.disabled = !buffer.canRedo;
  },
  updateButtonAddRemove = (): void => {
    add.textContent = `add ${maxInput - area.childElementCount}`;
    remove.textContent = `remove ${area.childElementCount - minInput}`;
    add.disabled = area.childElementCount >= maxInput;
    remove.disabled = area.childElementCount <= minInput;
  },
  retain = (): void => {
    const content: idval[] = [...area.querySelectorAll("input")].map(
      (e: HTMLInputElement): idval => ({ id: e.id, value: e.value })
    );
    if (buffer) {
      buffer.retain(content);
    } else {
      buffer = new Undo(content, 10);
    }
  },
  create = (data: idval | null = null): void => {
    const input: HTMLInputElement = document.createElement("input");
    [input.id, input.value] = data
      ? [data.id, data.value]
      : [`${area.childElementCount + 1}`, ""];
    input.addEventListener("change", (): void => {
      retain();
      updateButtonUndoRedo();
    });
    area.appendChild(input);
  },
  redraw = (r: idval[]): void => {
    area.innerHTML = "";
    r.forEach((e: idval): void => create(e));
    updateButtonUndoRedo();
    updateButtonAddRemove();
  };

add.addEventListener("click", (): void => {
  create();
  retain();
  updateButtonUndoRedo();
  updateButtonAddRemove();
});

remove.addEventListener("click", (): void => {
  const input: HTMLInputElement = area.querySelector("input:last-of-type")!;
  input.remove();
  retain();
  updateButtonUndoRedo();
  updateButtonAddRemove();
});

undo.addEventListener("click", (): void => redraw(buffer.undo()));

redo.addEventListener("click", (): void => redraw(buffer.redo()));

document.body.appendChild(undo);
document.body.appendChild(redo);
document.body.appendChild(area);
document.body.appendChild(add);
document.body.appendChild(remove);

add.dispatchEvent(new MouseEvent("click"));
```
