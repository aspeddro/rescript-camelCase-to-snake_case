# ReScript: camelCase to snake_case

1. First, create a branch on rescript-compiler folder

2. Install deps:

```sh
npm i
```

3. Run script
```sh
node main.js /path/to/rescript-compiler
```

4. Run `dune build -w` on rescript-compiler folder. Dune will report two erros on file `jscomp/frontend/ppx_entry.ml`

```
File "jscomp/frontend/ppx_entry.ml", line 34, characters 10-24:
34 |       let open Js_config in
               ^^^^^^^^^^^^^^
Warning 44 [open-shadow-identifier]: this open statement shadows the value identifier jsx_version (which is later used)
File "jscomp/frontend/ppx_entry.ml", line 35, characters 43-54:
35 |       let jsx_version = int_of_jsx_version jsx_version in
                                                ^^^^^^^^^^^
Error: This expression has type jsx_version option ref
       but an expression was expected of type jsx_version
Had 2 errors, waiting for filesystem changes...    
```

Rename `jsx_version` to `jsx_version_`

```diff
-   | Some jsx_version ->
+   | Some jsx_version_ ->
      let open Js_config in
-     let jsx_version = int_of_jsx_version jsx_version in
+     let jsx_version = int_of_jsx_version jsx_version_ in
```

5. Commit changes.

6. Run dune fmt `dune build @fmt --auto-promote`

7. Some nominations were not good, they are few and can be done by the editor manually.
