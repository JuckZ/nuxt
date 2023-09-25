package main

import (
	"fmt"
	"syscall/js"
)

func main() {
	c := make(chan struct{}, 0)
	fmt.Println("Hello, Started!")
	// 暴露一个全局的hello方法
	js.Global().Set("hello", js.FuncOf(hello))
	<-c
}

func hello(this js.Value, inputs []js.Value) interface{} {
	if len(inputs) > 0 {
		greeting := fmt.Sprintf("Hello, %s!", inputs[0].String())
		fmt.Println(greeting)
		return js.ValueOf(greeting)
	} else {
		greeting := "Hello, WebAssembly!"
		fmt.Println(greeting)
		return js.ValueOf(greeting)
	}
}
