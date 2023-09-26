package main

import (
	"fmt"
	"syscall/js"
)

//go:wasmimport _gotest add
func testAdd(uint32, uint32) uint32

func TestWasmImport() {
	a := uint32(3)
	b := uint32(5)
	want := a + b
	if got := testAdd(a, b); got != want {
		fmt.Printf("Got: %v, but want %v\n", got, want)
	} else {
		fmt.Printf("Values match: %v\n", got)
	}
}

// xor 函数接受两个整数参数并返回它们的异或结果。
func xor(this js.Value, p []js.Value) interface{} {
	a := p[0].Int()
	b := p[1].Int()
	return js.ValueOf(a ^ b)
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

func main() {
	c := make(chan struct{}, 0)
	TestWasmImport()
	fmt.Println("Hello, Started!")
	// 暴露一个全局的hello方法
	js.Global().Set("hello", js.FuncOf(hello))
	js.Global().Set("xor", js.FuncOf(xor))
	<-c
}
