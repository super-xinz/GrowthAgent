package xiaohongshu

import (
	"strings"
	"testing"
)

func TestComposerContainsIgnoresEditorWhitespace(t *testing.T) {
	if !composerContains("这是一条\n评论 回复", "这是一条评论回复") {
		t.Fatal("expected editor whitespace to be ignored")
	}
}

func TestComposerContainsDoesNotTreatReplyPlaceholderAsDraft(t *testing.T) {
	if composerContains("回复 @测试用户：", "这是一条评论回复") {
		t.Fatal("reply placeholder must not be treated as the submitted draft")
	}
}

func TestMakeFeedDetailURLUsesSearchTokenSource(t *testing.T) {
	url := makeFeedDetailURL("feed-1", "token-1")
	if !strings.Contains(url, "xsec_source=pc_search") {
		t.Fatalf("expected search token source, got %s", url)
	}
	if !strings.Contains(url, "source=web_search_result_notes") {
		t.Fatalf("expected web search result source, got %s", url)
	}
}

func TestCommentRequestSucceededUsesNetworkResponse(t *testing.T) {
	success := true
	if !commentRequestSucceeded(&observedCommentRequest{Status: 200, Done: true, Success: &success}) {
		t.Fatal("expected explicit successful response")
	}
	if !commentRequestSucceeded(&observedCommentRequest{Status: 200, Done: true, Code: float64(0)}) {
		t.Fatal("expected code zero response")
	}
	failure := false
	if commentRequestSucceeded(&observedCommentRequest{Status: 200, Done: true, Success: &failure}) {
		t.Fatal("must reject explicit API failure")
	}
	if commentRequestSucceeded(&observedCommentRequest{Status: 429, Done: true}) {
		t.Fatal("must reject non-success HTTP status")
	}
}
