# `check-js.py`

`check-js.py` is a Python script designed to help assist finding, fixing, and annotating (as safe or ignorable) usages of DOM api's innerHTML, or methods in the jQuery which modify the DOM and may use arbitrary strings, or usage of preact's dangerouslySetInnerHTML.

The script will report counts of detected safe usages, and annotations which mark usage as safe or ignorable.

## Usage

Within this codebase:

```shell
npm run check-js
```

or

```shell
sh tools/dom-safe/check-js.sh
```

To apply to any codebase:

```shell
python tools/dom-safe/check-js.py DIRECTORY [EXCLUDE-PATTERN]
```

For example:

```shell
python tools/dom-safe/check-js.py /Users/erikpearson/Work/KBase/2022/helpdesk/PTV-1620/narrative/kbase-extension/static "(ext_components)|(ext_modules)|(ext_packages)"
```

will check the javascript within the Narrative codebase, excluding paths which contain `ext_components`, `ext_modules`, or `ext_packages`.

An internal setting controls whether the output is verbose or not. In verbose mode or if cases are detected, the statistics from each scan are printed. For each scan, if cases are detected, all cases from the file with the most reported cases are printed. This facilitates iterative fixing, without overwhelming the display.

Since this is a Python script, it is easy to tweak if options are not exposed.

## Safe usage heuristics

The script applies some simple heuristics to determine safe usage of these potentially unsafe methods. It is not very smart, but does save some work.

Lines which contain more than one instance of a given jquery function are not subject to the hueristics, simply to keep the script simpler.

There is not very much usage of DOM's innerHTML or preact's dangerouslySetInnerHTML, so there is less safe usage detection for them.

- Using within a line comment (not block comments). Applied to all detections.

  ```javascript
  // this is safe $x.html('<div>i am safe</div>')
  ```

The following only apply to jQuery methods:

- Input is a simple string (single or double-quoted) without markup (angle brackets)
  ```javascript
  .html('hello')
  ```
- Input is a simple string (single or double-quoted) with simple markup which doesn't include "script"
  ```javascript
  .html('<div/>')
  ```
  Note that this is very strict, no spaces allowed within the function call
- Input is a jQuery object which itself takes a simple tag which isn't "script"
  ```javascript
  .append($('<div>'))
  ```
  or
  ```javascript
  .append($('<div>')
  ```
  Note that in the second form the final closing parentheses may be omitted; these functions take only a single argument and are often used in a chaining style.
- Input contains a call to `domSafeText`, which encodes the given text by using an anonymous div node to set the content with innerHTML and reading back as innerText.
- Input contains a call to `domSafeValue`, which coerces the given value to text first (otherwise same as above)
- Input contains a call to `domSafeErrorMessage`, which returns a dom safe string from a given error string or object.
- Input contains a call to `DOMPurity.sanitize`, which scrubs an arbitrary string for dangerous html usage.

> I didn't add the simple tag detection until I had manually annotated many instances of such. In reality, the workflow is often to jump into the file to be inspected and manually search for the jquery function, quickly adding the "xss safe" annotation for simply cases.

## Annotated usage

Annotations may be added above a detected unsafe usage to mark the usage as either safe or ignorable

### Safe usage

Safe usage is annotated by preceding the line with a comment like `\\ xss safe`, which may be followed by any other text. Applied to all detections other than preact.

Note that any number of spaces may be present within the comment.

```javascript
// xss safe
container.innerHTML = layout;
```

Note that in this example, the safe usgae is explained.

```javascript
// xss safe - as long as usage of createBSPanel is safe!
$node.html(
```

### Ignorable "usage"

Usage which is detected but is a false positive may be preceded with a comment like `\\ xss ignore`, which may be followed by other text. Applied to all detections other than preact.

      Note that any number of spaces may be present within the comment.

      Like `xss safe`, this causes the following line to be ignored, however it records it as ignored rather than safe.

      E.g. This definition of `wrap` is confused with the jQuery `wrap` method. (Yes, some heuristics could differentiate them, but probably not worth it given so few instances)

      ```javascript
      // xss ignore
      function wrap(text, width) {
      ```

## Fixes

Here we note common types of fixes.

### Annotation

- Add `\\ xss safe` annotation if the usage is considered safe

- Add `\\ xss ignore` annotation if the usage was caught by the script but is a false positive; e.g. not really a gquery method

### Code fixes

Any externally derived data, including all data from api calls, should generally be placed into the dom via DOM `innerText` or jquery `text()`. In the very few cases in which external data is expected to have html markup, it should be wrapped in a call to `DOMPurity.santize()`.

In many cases, though, html markup involving external data is built via interpolated or concatenated strings. In such cases, the safe "text" methods cannot be used. A set of utility functions should be used. Each of them uses a technique involving `innerHTML` and `innerText` to ensure that such values do not contain any html tags.

The technique:

- applies to any direct external value or string including an external value, but not including the actual markup
- create an unattached `div` tag.
- invoke DOM creation by setting `.innerHTML` for this tag with the subject string
- extract the text nodes of this string by getting the `.innerText` for this tag.
- this has the effect of "stripping" out any html tags from the content

The first method, `domSafeText` applies this technique to a string, setting the innerHTML directly from the provided value.

The second, `domSafeValue`, attempts to coerce the value first to a string, and then sets innerHTML. It throws an error if the value is not a simple Javascript value string, number, or boolean. (In reality, innerHTML does a great job of coercing values, so this is really not necessary - I may go back and remove this function and replace all usages with domSafeText. For one, this would not throw an error in cases of unexpected values.)

A common use case is to use an error message string in an error display. This is often done by simple string interpolation or concatenation. For such cases there are several approaches.

- wrap the message in domSafeText()
- extract the message using errorMessage from domUtils.js. This pokes at the given error object to determine where the message is best derived from. It handles string, JSONRPC exception, general Error-derived exception, or an object which looks like a KBase JSONRPC error response. It wraps the resulting message in domSafeTExt.
- create an error alert using $errorAlert from jqueryUtils.js. This uses errorMessage to extract the message, and displays the message in a bootstrap alert with danger style.

For data provided by ca

## Considerations

- could improve safe usage heuristics to avoid so many safe usage comments. There are many usages of jquery which are inherently safe, such as using a jquery object as input to `html()`.

- on the other hand, these are sometimes indications of complex chains of DOM construction which need tracing. Essentially, one wants to determine that the markup being generated is being safely done, and that is by its nature situational.

- For example:
  - usage of string variables as input
  - usage of jquery objects as input
  - usage of jquery global call as input

Of course it would be possible to detect many more safe cases, but that would be quite complex and involve static analysis, a bit beyond this scope.

Code fixes involving patching jquery were not considered.

In some cases, code was found to be unused and was simply removed.

Ultimately the best solution for the vast majority of cases would be rewriting in a safe manner using modern techniques. For instance:

- replace all usage of string-building with jquery-building, using `text()` where possible
- replace all usage of jquery with preact, which makes unsafe usage harder and rarer
