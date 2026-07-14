package xiaohongshu

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/proto"
	"github.com/sirupsen/logrus"
)

// CommentFeedAction 表示 Feed 评论动作
type CommentFeedAction struct {
	page *rod.Page
}

type commentComposer struct {
	input  *rod.Element
	submit *rod.Element
}

type observedCommentRequest struct {
	URL     string `json:"url"`
	Method  string `json:"method"`
	Status  int    `json:"status"`
	Done    bool   `json:"done"`
	Code    any    `json:"code"`
	Success *bool  `json:"success"`
	Message string `json:"message"`
}

// NewCommentFeedAction 创建 Feed 评论动作
func NewCommentFeedAction(page *rod.Page) *CommentFeedAction {
	return &CommentFeedAction{page: page}
}

// PostComment 发表评论到 Feed
func (f *CommentFeedAction) PostComment(ctx context.Context, feedID, xsecToken, content string) error {
	// 不使用 Context(ctx)，避免继承外部 context 的超时
	page := f.page.Timeout(60 * time.Second)

	url := makeFeedDetailURL(feedID, xsecToken)
	logrus.Infof("打开 feed 详情页: %s", url)

	// 导航到详情页
	page.MustNavigate(url)
	page.MustWaitDOMStable()
	time.Sleep(1 * time.Second)

	// 检测页面是否可访问
	if err := checkPageAccessible(page); err != nil {
		return err
	}

	if err := submitCommentComposer(page, content, false); err != nil {
		return fmt.Errorf("发表评论失败: %w", err)
	}

	logrus.Infof("Comment posted successfully to feed: %s", feedID)
	return nil
}

// ReplyToComment 回复指定评论
func (f *CommentFeedAction) ReplyToComment(ctx context.Context, feedID, xsecToken, commentID, userID, content string) error {
	// 增加超时时间，因为需要滚动查找评论
	// 注意：不使用 Context(ctx)，避免继承外部 context 的超时
	page := f.page.Timeout(5 * time.Minute)
	url := makeFeedDetailURL(feedID, xsecToken)
	logrus.Infof("打开 feed 详情页进行回复: %s", url)

	// 导航到详情页
	page.MustNavigate(url)
	page.MustWaitDOMStable()
	time.Sleep(1 * time.Second)

	// 检测页面是否可访问
	if err := checkPageAccessible(page); err != nil {
		return err
	}

	// 等待评论容器加载
	time.Sleep(2 * time.Second)

	// 使用 Go 实现的查找逻辑
	commentEl, err := findCommentElement(page, commentID, userID)
	if err != nil {
		return fmt.Errorf("无法找到评论: %w", err)
	}

	// 滚动到评论位置
	logrus.Info("滚动到评论位置...")
	commentEl.MustScrollIntoView()
	time.Sleep(1 * time.Second)

	logrus.Info("准备点击回复按钮")

	// 查找并点击回复按钮
	replyBtn, err := commentEl.Element(".right .interactions .reply")
	if err != nil {
		return fmt.Errorf("无法找到回复按钮: %w", err)
	}

	if err := replyBtn.Click(proto.InputMouseButtonLeft, 1); err != nil {
		return fmt.Errorf("点击回复按钮失败: %w", err)
	}

	time.Sleep(1 * time.Second)

	if err := submitCommentComposer(page, content, true); err != nil {
		return fmt.Errorf("回复评论失败: %w", err)
	}

	logrus.Infof("回复评论成功")
	return nil
}

// submitCommentComposer selects the active, visible composer and submits it once.
// Xiaohongshu may render more than one hidden composer on a note page; selecting
// the first global match makes replies type into/click the wrong composer.
func submitCommentComposer(page *rod.Page, content string, preferReply bool) error {
	composer, err := findCommentComposer(page, preferReply)
	if err != nil {
		return err
	}

	if err := composer.input.Click(proto.InputMouseButtonLeft, 1); err != nil {
		return fmt.Errorf("无法聚焦输入框: %w", err)
	}
	if err := composer.input.Input(content); err != nil {
		return fmt.Errorf("无法输入内容: %w", err)
	}
	// Rod sends real key events. Dispatch an extra bubbling input event because
	// recent Xiaohongshu editors sometimes update the DOM before Vue state.
	_, _ = composer.input.Eval(`() => {
		this.dispatchEvent(new InputEvent('input', {bubbles: true, inputType: 'insertText'}));
		this.dispatchEvent(new Event('change', {bubbles: true}));
		return true;
	}`)

	if err := waitForComposerText(composer.input, content, 3*time.Second); err != nil {
		return err
	}
	if err := waitForSubmitEnabled(composer.submit, 5*time.Second); err != nil {
		return err
	}
	if err := installCommentRequestObserver(page); err != nil {
		return fmt.Errorf("无法安装提交结果监听: %w", err)
	}

	// First use a trusted browser click. Some Xiaohongshu builds swallow the
	// synthetic mouse sequence even though the button is visible and unobscured.
	if err := composer.submit.Click(proto.InputMouseButtonLeft, 1); err != nil {
		return fmt.Errorf("无法点击当前输入框的提交按钮: %w", err)
	}
	request, observed, err := waitForCommentRequest(page, 2500*time.Millisecond)
	if err != nil {
		return err
	}
	if !observed {
		// No POST request was emitted, so it is safe to invoke the same live
		// button's DOM click handler once. This is not a write retry: the network
		// observer proved that the trusted click never reached the API.
		if _, clickErr := composer.submit.Eval(`() => { this.click(); return true; }`); clickErr != nil {
			return fmt.Errorf("发送按钮点击事件未触发: %w", clickErr)
		}
		request, observed, err = waitForCommentRequest(page, 15*time.Second)
		if err != nil {
			return err
		}
	}
	if !observed || request == nil {
		return fmt.Errorf("发送按钮已点击，但页面未发起评论 POST 请求")
	}
	if !request.Done {
		return fmt.Errorf("小红书已接收提交请求，但 15 秒内未返回结果；为避免重复发布，系统没有重试")
	}
	if !commentRequestSucceeded(request) {
		message := strings.TrimSpace(request.Message)
		if message == "" {
			message = fmt.Sprintf("HTTP %d, code=%v", request.Status, request.Code)
		}
		return fmt.Errorf("小红书拒绝了回复：%s", message)
	}
	return nil
}

func installCommentRequestObserver(page *rod.Page) error {
	_, err := page.Eval(`() => {
		window.__threadPilotCommentRequests = [];
		const relevant = (url, method) => String(method || 'GET').toUpperCase() === 'POST' && /comment/i.test(String(url || ''));
		const finish = (entry, status, text) => {
			entry.status = status || 0;
			entry.done = true;
			try {
				const payload = JSON.parse(text || '{}');
				const data = payload.data || {};
				entry.code = payload.code ?? data.code ?? null;
				entry.success = payload.success ?? data.success ?? null;
				entry.message = payload.msg || payload.message || payload.error || data.msg || data.message || '';
			} catch (_) {}
		};
		if (!window.__threadPilotOriginalFetch) {
			window.__threadPilotOriginalFetch = window.fetch;
			window.fetch = function(resource, init) {
				const url = typeof resource === 'string' ? resource : resource && resource.url;
				const method = (init && init.method) || (resource && resource.method) || 'GET';
				let entry = null;
				if (relevant(url, method)) {
					entry = {url: String(url), method: String(method).toUpperCase(), status: 0, done: false, code: null, success: null, message: ''};
					window.__threadPilotCommentRequests.push(entry);
				}
				return window.__threadPilotOriginalFetch.apply(this, arguments).then(response => {
					if (entry) response.clone().text().then(text => finish(entry, response.status, text)).catch(() => finish(entry, response.status, ''));
					return response;
				}, error => {
					if (entry) { entry.done = true; entry.message = String(error); }
					throw error;
				});
			};
		}
		if (!XMLHttpRequest.prototype.__threadPilotOriginalOpen) {
			XMLHttpRequest.prototype.__threadPilotOriginalOpen = XMLHttpRequest.prototype.open;
			XMLHttpRequest.prototype.open = function(method, url) {
				this.__threadPilotMethod = method;
				this.__threadPilotURL = url;
				return XMLHttpRequest.prototype.__threadPilotOriginalOpen.apply(this, arguments);
			};
			XMLHttpRequest.prototype.__threadPilotOriginalSend = XMLHttpRequest.prototype.send;
			XMLHttpRequest.prototype.send = function() {
				let entry = null;
				if (relevant(this.__threadPilotURL, this.__threadPilotMethod)) {
					entry = {url: String(this.__threadPilotURL), method: String(this.__threadPilotMethod).toUpperCase(), status: 0, done: false, code: null, success: null, message: ''};
					window.__threadPilotCommentRequests.push(entry);
					this.addEventListener('loadend', () => finish(entry, this.status, this.responseText), {once: true});
				}
				return XMLHttpRequest.prototype.__threadPilotOriginalSend.apply(this, arguments);
			};
		}
		return true;
	}`)
	return err
}

func waitForCommentRequest(page *rod.Page, timeout time.Duration) (*observedCommentRequest, bool, error) {
	deadline := time.Now().Add(timeout)
	var latest *observedCommentRequest
	for time.Now().Before(deadline) {
		requests, err := observedCommentRequests(page)
		if err != nil {
			return nil, false, fmt.Errorf("无法读取提交结果: %w", err)
		}
		if len(requests) > 0 {
			latest = &requests[len(requests)-1]
			if latest.Done {
				return latest, true, nil
			}
		}
		time.Sleep(100 * time.Millisecond)
	}
	return latest, latest != nil, nil
}

func observedCommentRequests(page *rod.Page) ([]observedCommentRequest, error) {
	result, err := page.Eval(`() => JSON.stringify(window.__threadPilotCommentRequests || [])`)
	if err != nil {
		return nil, err
	}
	var requests []observedCommentRequest
	if err := json.Unmarshal([]byte(result.Value.Str()), &requests); err != nil {
		return nil, err
	}
	return requests, nil
}

func commentRequestSucceeded(request *observedCommentRequest) bool {
	if request == nil || request.Status < 200 || request.Status >= 300 {
		return false
	}
	if request.Success != nil {
		return *request.Success
	}
	switch code := request.Code.(type) {
	case nil:
		return true
	case float64:
		return code == 0
	case string:
		return code == "0" || strings.EqualFold(code, "success")
	default:
		return false
	}
}

func findCommentComposer(page *rod.Page, preferReply bool) (*commentComposer, error) {
	inputs, err := page.Elements("div.input-box div.content-edit p.content-input")
	if err != nil {
		return nil, fmt.Errorf("未找到评论输入区域: %w", err)
	}

	var selected *rod.Element
	bestScore := -1
	for _, input := range inputs {
		if !isElementVisible(input) {
			continue
		}
		score := 1
		if focused, evalErr := input.Eval(`() => this === document.activeElement || this.contains(document.activeElement)`); evalErr == nil && focused.Value.Bool() {
			score += 100
		}
		if placeholder, attrErr := input.Attribute("data-placeholder"); attrErr == nil && placeholder != nil {
			isReply := strings.Contains(*placeholder, "回复")
			if isReply == preferReply {
				score += 20
			}
		}
		if score > bestScore {
			selected = input
			bestScore = score
		}
	}
	if selected == nil {
		return nil, fmt.Errorf("没有可见的评论输入框")
	}

	// The current Xiaohongshu DOM places ``div.bottom`` outside ``div.input-box``
	// on some note pages. Walk outward and select the nearest ancestor that owns
	// a visible submit button instead of assuming a fixed parent structure.
	container := selected
	for depth := 0; depth < 12; depth++ {
		buttons, buttonErr := container.Elements("button.submit")
		if buttonErr == nil {
			for _, button := range buttons {
				if isElementVisible(button) {
					return &commentComposer{input: selected, submit: button}, nil
				}
			}
		}
		parent, parentErr := container.Parent()
		if parentErr != nil {
			break
		}
		container = parent
	}

	// Portal-based variants can render the button outside the editor ancestry.
	// Only a visible button is eligible, avoiding the original hidden-first bug.
	buttons, err := page.Elements("div.bottom button.submit, button.submit")
	if err == nil {
		for _, button := range buttons {
			if isElementVisible(button) {
				return &commentComposer{input: selected, submit: button}, nil
			}
		}
	}
	return nil, fmt.Errorf("当前输入框附近没有可见的提交按钮")
}

func waitForComposerText(input *rod.Element, content string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		text, err := input.Text()
		if err == nil && composerContains(text, content) {
			return nil
		}
		time.Sleep(100 * time.Millisecond)
	}
	return fmt.Errorf("输入内容未被小红书编辑器接收，请重新打开目标后再试")
}

func waitForSubmitEnabled(button *rod.Element, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		disabled, _ := button.Attribute("disabled")
		ariaDisabled, _ := button.Attribute("aria-disabled")
		className, _ := button.Attribute("class")
		isDisabled := disabled != nil ||
			(ariaDisabled != nil && *ariaDisabled == "true") ||
			(className != nil && hasExactClass(*className, "disabled"))
		if !isDisabled {
			return nil
		}
		time.Sleep(100 * time.Millisecond)
	}
	return fmt.Errorf("提交按钮一直不可用，请检查内容长度或小红书账号状态")
}

func composerContains(actual, expected string) bool {
	normalize := func(value string) string {
		return strings.Join(strings.Fields(value), "")
	}
	expected = normalize(expected)
	return expected != "" && strings.Contains(normalize(actual), expected)
}

// findCommentElement 查找指定评论元素（参考 feed_detail.go 的滚动逻辑）
func findCommentElement(page *rod.Page, commentID, userID string) (*rod.Element, error) {
	logrus.Infof("开始查找评论 - commentID: %s, userID: %s", commentID, userID)

	const maxAttempts = 100
	const scrollInterval = 800 * time.Millisecond

	// 先滚动到评论区
	scrollToCommentsArea(page)
	time.Sleep(1 * time.Second)

	var lastCommentCount = 0
	stagnantChecks := 0

	logrus.Infof("开始循环查找，最大尝试次数: %d", maxAttempts)

	for attempt := 0; attempt < maxAttempts; attempt++ {
		logrus.Infof("=== 查找尝试 %d/%d ===", attempt+1, maxAttempts)

		// === 1. 检查是否到达底部 ===
		if checkEndContainer(page) {
			logrus.Info("已到达评论底部，未找到目标评论")
			break
		}

		// === 2. 获取当前评论数量 ===
		currentCount := getCommentCount(page)
		logrus.Infof("当前评论数: %d", currentCount)

		if currentCount != lastCommentCount {
			logrus.Infof("✓ 评论数增加: %d -> %d", lastCommentCount, currentCount)
			lastCommentCount = currentCount
			stagnantChecks = 0
		} else {
			stagnantChecks++
			if stagnantChecks%5 == 0 {
				logrus.Infof("评论数停滞 %d 次", stagnantChecks)
			}
		}

		// === 3. 停滞检测 ===
		if stagnantChecks >= 10 {
			logrus.Info("评论数量停滞超过10次，可能已加载完所有评论")
			break
		}

		// === 4. 先滚动到最后一个评论（触发懒加载）===
		if currentCount > 0 {
			logrus.Infof("滚动到最后一个评论（共 %d 条）", currentCount)

			// 使用 Go 获取所有评论元素
			elements, err := page.Timeout(2 * time.Second).Elements(".parent-comment, .comment-item, .comment")
			if err == nil && len(elements) > 0 {
				// 滚动到最后一个评论
				lastComment := elements[len(elements)-1]
				err := lastComment.ScrollIntoView()
				if err != nil {
					logrus.Warnf("滚动到最后一个评论失败: %v", err)
				}
			} else {
				logrus.Warnf("未找到评论元素: %v", err)
			}
			time.Sleep(300 * time.Millisecond)
		}

		// === 5. 继续向下滚动 ===
		logrus.Infof("继续向下滚动...")
		_, err := page.Eval(`() => { window.scrollBy(0, window.innerHeight * 0.8); return true; }`)
		if err != nil {
			logrus.Warnf("滚动失败: %v", err)
		}
		time.Sleep(500 * time.Millisecond)

		// === 6. 滚动后立即查找（边滚动边查找）===
		// 优先通过 commentID 查找（使用 Timeout 避免长时间等待）
		if commentID != "" {
			selector := fmt.Sprintf("#comment-%s", commentID)
			logrus.Infof("尝试通过 commentID 查找: %s", selector)

			// 使用 Timeout 避免长时间等待
			el, err := page.Timeout(2 * time.Second).Element(selector)
			if err == nil && el != nil {
				logrus.Infof("✓ 通过 commentID 找到评论: %s (尝试 %d 次)", commentID, attempt+1)
				return el, nil
			}
			logrus.Infof("未找到 commentID (2秒超时)")
		}

		// 通过 userID 查找
		if userID != "" {
			logrus.Infof("尝试通过 userID 查找: %s", userID)

			// 使用 Timeout 避免长时间等待
			elements, err := page.Timeout(2 * time.Second).Elements(".comment-item, .comment, .parent-comment")
			if err == nil && len(elements) > 0 {
				logrus.Infof("找到 %d 个评论元素", len(elements))
				for i, el := range elements {
					// 快速检查，不等待
					userEl, err := el.Timeout(500 * time.Millisecond).Element(fmt.Sprintf(`a[href*="%s"]`, userID))
					if err == nil && userEl != nil {
						logrus.Infof("✓ 通过 userID 在第 %d 个元素中找到评论: %s (尝试 %d 次)", i+1, userID, attempt+1)
						return el, nil
					}
				}
				logrus.Infof("在 %d 个元素中未找到匹配的 userID", len(elements))
			} else {
				logrus.Infof("获取评论元素失败或超时: %v", err)
			}
		}

		logrus.Infof("本次尝试未找到目标评论，继续下一轮...")

		// === 7. 等待内容加载 ===
		time.Sleep(scrollInterval)
	}

	return nil, fmt.Errorf("未找到评论 (commentID: %s, userID: %s), 尝试次数: %d", commentID, userID, maxAttempts)
}
