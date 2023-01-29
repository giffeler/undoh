(module
 (func $modulo (param $n i32) (param $d i32) (result i32)
   (i32.rem_s (local.get $n) (local.get $d))
   (i32.add (local.get $d))
   (i32.rem_s (local.get $d))
 )
 (export "modulo" (func 0))
)
