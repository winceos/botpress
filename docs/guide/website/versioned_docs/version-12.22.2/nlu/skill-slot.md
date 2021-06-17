---
id: version-12.22.2-skill-slot
title: Slots
original_id: skill-slot
---

Slots are a significant concept in Botpress NLU. You can think of them as necessary **parameters** to complete the action associated with an intent.

## Slot Tagging
Botpress Native NLU will tag each _word_ (token) of user input. Words separated by a hyphen are treated as one token. If the token is correctly identified as a slot, it will be attached to the NLU extraction event. Each identified slot will be accessible in the `event.nlu.slots` object using its name as the key.

### Defining Slots
To define a slot for a particular intent, open the **Intent section** of the Natural Language Understanding Module in your Botpress Studio sidebar. From there, select the intent you want to add slots to, then you'll be able to define your slots. Go ahead and click on **create a slot**

![create slot](../assets/nlu-create-slot.png)

Let's use a `book_flight` intent. To book a flight, we'll define two slots: `departure` and `destination`, both associated with the `Airport Codes` custom list entity. Once that is done, we need to identify every airport slot.

![tag slots](../assets/nlu-tag-slot.png)

### Example

The user said: `I would like to go to SFO from Mumbai.`

`event.nlu.slots` will look like

```js
slots : {
  airport_to: {
    name: 'airport_to',
    value: 'SFO', // shorthand for entity.data.value
    entity: [Object] //detailed extracted entity
  },
  airport_from: {
    name: 'airport_from',
    value: 'BOM',  // shorthand for entity.data.value
    entity: [Object] //detailed extracted entity
  }
}
```

## Slot Filling

Slot filling is the process of gathering information required by an intent. This information is defined as _slots_ as we mentioned in the above section.  It handles input validation and the chatbot's reply when the input is invalid. Botpress has an in-built skill to handle the slot filling process.

### Creating a slot skill
We will use the slots which we defined earlier in this tutorial.

1. In the Flow Editor view, click on Insert skill > Slot.
2. Choose an intent to use for the slot filling.
3. Choose a slot to fill.
4. Choose the content that your chatbot will ask. It should be a question about the information you seek, e.g., "From where are you departing?", "Where do you want to go?" etc.
5. Choose the content for your chatbot reply when the input is invalid. It should guide the user towards a valid answer.

![Skill Slot Overview](../assets/slot-skill-overview.png)

### Validation Types

There are two types of validations:

1. **Input validation**: The first validation is based on entity extraction. If the provided information doesn't match the entity of the slot, the chatbot will notify the user. This will not apply when the slot has the type `@system.any`. In this case, the chatbot will ultimately provide the complete user phrase when it fails to match a slot confidently.
2. **Custom Input Validation**: you can use an action to add custom validation, e.g., regex, type validation (number, string). The action should set the variable `temp.valid` to either true or false based on the validation result.

### Max retry attempts

How many times the chatbot should try to get the correct answer. `On not found` outcome will be triggered when the maximum is reached.

### Outcomes

Three outcomes are possible:

1. **`On extracted`** - The slot has been successfully extracted. It will be stored in `session.slots.<slot_name>`
2. **`On not found`** - The slot has not been extracted. This will also happen when the maximum number of retries is reached or when custom validation fails.
3. **`On already extracted`** - The slot has previously been extracted. One use-case for that would be to ask the user if the previous information is still relevant or if he would like to overwrite it.

![Slot skill outcomes](../assets/slot-skill-outcomes.png)

## Chaining Multiple Slots

You can chain multiple skills to fill all the slots for a given intent. Chaining skills is handy when all the slots in a given intent are mandatory for a data set to be complete. In the flight booking example, we need the _departure city_, _destination city_, and _time of departure_ to check if a flight is available. Since these fields are mandatory, this is a good use case for skill chaining.

![Skill Slot Flow](../assets/slot-skill-flow.png)

This flow will result in a conversation like the one below. Notice that in the first phrase, "I want to book a flight to NYC", the intent "book-flight" is matched, and NYC has been extracted as the _to_ slot. Then, the chatbot tries to fill the remaining slots _from_ and _when_.

![Skill Slot Convo](../assets/slot-skill-convo.png)
