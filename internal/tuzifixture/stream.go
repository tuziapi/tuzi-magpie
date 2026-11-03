//go:build tuzi_fixture

package tuzifixture

import "strings"

func Stream(protocol, model string) string {
	if protocol == "anthropic" {
		return strings.ReplaceAll(`event: message_start
 data: {"type":"message_start","message":{"id":"msg_fixture","type":"message","role":"assistant","model":"`+model+`","content":[],"stop_reason":null,"usage":{"input_tokens":1,"output_tokens":0}}}

 event: content_block_start
 data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

 event: content_block_delta
 data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"TUZI_CLI_OK"}}

 event: content_block_stop
 data: {"type":"content_block_stop","index":0}

 event: message_delta
 data: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":1}}

 event: message_stop
 data: {"type":"message_stop"}

`, "\n ", "\n")
	}
	item := `{"id":"msg_fixture","type":"message","role":"assistant","status":"completed","content":[{"type":"output_text","text":"TUZI_CLI_OK","annotations":[]}]}`
	return "event: response.created\ndata: " + `{"type":"response.created","response":{"id":"resp_fixture","object":"response","status":"in_progress","model":"` + model + `","output":[]}}` + "\n\nevent: response.output_item.added\ndata: " + `{"type":"response.output_item.added","output_index":0,"item":` + item + `}` + "\n\nevent: response.output_text.delta\ndata: " + `{"type":"response.output_text.delta","item_id":"msg_fixture","output_index":0,"content_index":0,"delta":"TUZI_CLI_OK"}` + "\n\nevent: response.output_item.done\ndata: " + `{"type":"response.output_item.done","output_index":0,"item":` + item + `}` + "\n\nevent: response.completed\ndata: " + `{"type":"response.completed","response":{"id":"resp_fixture","object":"response","status":"completed","model":"` + model + `","output":[` + item + `],"usage":{"input_tokens":1,"output_tokens":1,"total_tokens":2}}}` + "\n\n"
}
